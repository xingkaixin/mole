package backend

import (
	"database/sql"
	"fmt"
	"sync"
	"time"
)

// ConnectionPool 连接池
type ConnectionPool struct {
	config      *DatabaseConfig
	connections chan *sql.DB
	mu          sync.RWMutex
	maxSize     int
	currentSize int
}

// NewConnectionPool 创建连接池
func NewConnectionPool(config *DatabaseConfig, maxSize int) (*ConnectionPool, error) {
	pool := &ConnectionPool{
		config:      config,
		connections: make(chan *sql.DB, maxSize),
		maxSize:     maxSize,
		currentSize: 0,
	}

	// 初始化连接池
	for i := 0; i < maxSize; i++ {
		conn, err := pool.createConnection()
		if err != nil {
			// 如果创建连接失败，关闭已创建的连接
			pool.Close()
			return nil, fmt.Errorf("failed to initialize connection pool: %w", err)
		}
		pool.connections <- conn
		pool.currentSize++
	}

	return pool, nil
}

// createConnection 创建新连接
func (cp *ConnectionPool) createConnection() (*sql.DB, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s",
		cp.config.Username,
		cp.config.Password,
		cp.config.Host,
		cp.config.Port,
		cp.config.Database)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// 设置连接池参数
	db.SetMaxOpenConns(1) // 每个连接只能被一个goroutine使用
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(time.Hour)

	// 测试连接
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

// GetConnection 获取连接
func (cp *ConnectionPool) GetConnection() (*sql.DB, error) {
	select {
	case conn := <-cp.connections:
		// 检查连接是否仍然有效
		if err := conn.Ping(); err != nil {
			// 连接无效，创建新连接
			newConn, err := cp.createConnection()
			if err != nil {
				// 创建新连接失败，将无效连接放回池中（其他goroutine可能会重试）
				cp.connections <- conn
				return nil, err
			}
			// 关闭无效连接
			conn.Close()
			return newConn, nil
		}
		return conn, nil
	default:
		// 连接池为空，创建新连接
		cp.mu.Lock()
		if cp.currentSize < cp.maxSize {
			conn, err := cp.createConnection()
			if err != nil {
				cp.mu.Unlock()
				return nil, err
			}
			cp.currentSize++
			cp.mu.Unlock()
			return conn, nil
		}
		cp.mu.Unlock()

		// 连接池已满，等待可用连接
		conn := <-cp.connections
		// 检查连接是否仍然有效
		if err := conn.Ping(); err != nil {
			// 连接无效，创建新连接
			newConn, err := cp.createConnection()
			if err != nil {
				// 创建新连接失败，将无效连接放回池中
				cp.connections <- conn
				return nil, err
			}
			// 关闭无效连接
			conn.Close()
			return newConn, nil
		}
		return conn, nil
	}
}

// ReleaseConnection 释放连接
func (cp *ConnectionPool) ReleaseConnection(conn *sql.DB) {
	// 检查连接是否仍然有效
	if err := conn.Ping(); err != nil {
		// 连接无效，关闭它
		conn.Close()
		cp.mu.Lock()
		cp.currentSize--
		cp.mu.Unlock()
		return
	}

	// 将有效连接放回池中
	select {
	case cp.connections <- conn:
		// 连接成功放回池中
	default:
		// 连接池已满，关闭连接
		conn.Close()
		cp.mu.Lock()
		cp.currentSize--
		cp.mu.Unlock()
	}
}

// Close 关闭连接池
func (cp *ConnectionPool) Close() error {
	cp.mu.Lock()
	defer cp.mu.Unlock()

	close(cp.connections)
	var errs []error

	// 关闭所有连接
	for conn := range cp.connections {
		if err := conn.Close(); err != nil {
			errs = append(errs, err)
		}
		cp.currentSize--
	}

	if len(errs) > 0 {
		return fmt.Errorf("errors closing connections: %v", errs)
	}

	return nil
}

// GetStats 获取连接池统计信息
func (cp *ConnectionPool) GetStats() map[string]interface{} {
	cp.mu.RLock()
	defer cp.mu.RUnlock()

	return map[string]interface{}{
		"max_size":     cp.maxSize,
		"current_size": cp.currentSize,
		"available":    len(cp.connections),
		"in_use":       cp.currentSize - len(cp.connections),
	}
}

// ConnectionPoolManager 连接池管理器
type ConnectionPoolManager struct {
	pools map[string]*ConnectionPool
	mu    sync.RWMutex
}

// NewConnectionPoolManager 创建连接池管理器
func NewConnectionPoolManager() *ConnectionPoolManager {
	return &ConnectionPoolManager{
		pools: make(map[string]*ConnectionPool),
	}
}

// GetPool 获取连接池
func (cpm *ConnectionPoolManager) GetPool(config *DatabaseConfig) (*ConnectionPool, error) {
	cpm.mu.Lock()
	defer cpm.mu.Unlock()

	poolID := config.ID
	if pool, exists := cpm.pools[poolID]; exists {
		return pool, nil
	}

	// 创建新连接池
	maxSize := config.Concurrency
	if maxSize <= 0 {
		maxSize = 5 // 默认并发度
	}

	pool, err := NewConnectionPool(config, maxSize)
	if err != nil {
		return nil, err
	}

	cpm.pools[poolID] = pool
	return pool, nil
}

// ClosePool 关闭连接池
func (cpm *ConnectionPoolManager) ClosePool(poolID string) error {
	cpm.mu.Lock()
	defer cpm.mu.Unlock()

	pool, exists := cpm.pools[poolID]
	if !exists {
		return fmt.Errorf("pool not found")
	}

	delete(cpm.pools, poolID)
	return pool.Close()
}

// CloseAll 关闭所有连接池
func (cpm *ConnectionPoolManager) CloseAll() error {
	cpm.mu.Lock()
	defer cpm.mu.Unlock()

	var errs []error
	for poolID, pool := range cpm.pools {
		if err := pool.Close(); err != nil {
			errs = append(errs, fmt.Errorf("pool %s: %w", poolID, err))
		}
		delete(cpm.pools, poolID)
	}

	if len(errs) > 0 {
		return fmt.Errorf("errors closing pools: %v", errs)
	}

	return nil
}