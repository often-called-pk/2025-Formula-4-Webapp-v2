import unittest
import os
import sys
import tempfile
import pandas as pd
from datetime import datetime

# Add paths for imports
sys.path.append('services')
sys.path.append('models')

from services.database import DatabaseManager, SessionRepository, CacheManager, DatabaseConfig
from services.data_processor import TelemetryProcessor
from models.telemetry_models import SessionData, LapData, TelemetryDataPoint

class TestDatabaseIntegration(unittest.TestCase):
    """Test cases for database integration and storage functionality"""
    
    def setUp(self):
        """Set up test fixtures with in-memory database"""
        # Use SQLite for testing to avoid PostgreSQL dependency
        self.test_db_url = "sqlite:///test_formula4.db"
        
        # Override database configuration for testing
        test_config = DatabaseConfig()
        test_config.database_url = self.test_db_url
        test_config.redis_url = "redis://localhost:6379/15"  # Use different DB for testing
        
        # Initialize database manager
        self.db_manager = DatabaseManager(test_config)
        self.db_manager.create_tables()
        
        # Initialize repositories
        self.session_repo = SessionRepository(self.db_manager)
        self.cache_manager = CacheManager(self.db_manager)
        
        # Initialize processor
        self.processor = TelemetryProcessor()
    
    def tearDown(self):
        """Clean up test database"""
        if os.path.exists("test_formula4.db"):
            os.remove("test_formula4.db")
    
    def create_test_session_data(self, driver_name: str = "Test Driver") -> SessionData:
        """Create test session data"""
        data_points = []
        
        # Create 100 data points (5 seconds at 20Hz)
        for i in range(100):
            time = i * 0.05
            speed = 100 + 20 * (i / 100)  # Increasing speed
            
            point = TelemetryDataPoint(
                time=time,
                speed=speed,
                throttle_pos=80 + (i % 20),
                brake_pos=0 if i < 80 else (i - 80) * 2,
                gear=min(6, max(1, int(speed / 35) + 1)),
                rpm=speed * 50 + 2000,
                gps_latitude=37.4419 + 0.001 * (i / 100),
                gps_longitude=-122.1430 + 0.001 * (i / 100),
                water_temp=80 + (i % 10),
                oil_temp=85 + (i % 8)
            )
            data_points.append(point)
        
        lap = LapData(
            lap_number=1,
            start_time=0.0,
            end_time=5.0,
            lap_time=65.5,
            data_points=data_points,
            is_fastest=True
        )
        
        return SessionData(
            driver_name=driver_name,
            session_name="Test Session",
            track_name="Test Track",
            laps=[lap],
            fastest_lap=lap,
            metadata={
                "Racer": driver_name,
                "Session": "Test Session",
                "Championship": "Test Championship",
                "Vehicle": "Test Vehicle",
                "Duration": "300.0",
                "Sample Rate": "20"
            }
        )
    
    def test_database_connection(self):
        """Test database connection and health check"""
        health = self.db_manager.health_check()
        
        self.assertIn("database", health)
        self.assertEqual(health["database"]["status"], "healthy")
    
    def test_session_storage_and_retrieval(self):
        """Test storing and retrieving session data"""
        # Create test data
        session_data = self.create_test_session_data("John Doe")
        file_info = {"filename": "test.csv", "size": 1000}
        
        # Store session
        session_id = self.session_repo.create_session_from_data(session_data, file_info)
        
        self.assertIsNotNone(session_id)
        self.assertIsInstance(session_id, int)
        self.assertGreater(session_id, 0)
        
        # Retrieve session
        retrieved_session = self.session_repo.get_session_by_id(session_id)
        
        self.assertIsNotNone(retrieved_session)
        self.assertEqual(retrieved_session.driver.name, "John Doe")
        self.assertEqual(retrieved_session.session_name, "Test Session")
        self.assertEqual(len(retrieved_session.laps), 1)
        self.assertEqual(len(retrieved_session.laps[0].telemetry_points), 100)
    
    def test_driver_and_track_creation(self):
        """Test automatic driver and track creation"""
        # Create sessions for multiple drivers
        session1 = self.create_test_session_data("Driver A")
        session2 = self.create_test_session_data("Driver B")
        
        file_info = {"filename": "test.csv", "size": 1000}
        
        # Store sessions
        session_id1 = self.session_repo.create_session_from_data(session1, file_info)
        session_id2 = self.session_repo.create_session_from_data(session2, file_info)
        
        # Verify both sessions were stored
        self.assertIsNotNone(session_id1)
        self.assertIsNotNone(session_id2)
        
        # Check drivers were created
        with self.db_manager.get_db_session() as session:
            from models.database_models import Driver
            drivers = session.query(Driver).all()
            driver_names = [d.name for d in drivers]
            
            self.assertIn("Driver A", driver_names)
            self.assertIn("Driver B", driver_names)
    
    def test_cache_functionality(self):
        """Test Redis caching functionality"""
        if not self.cache_manager.redis_client:
            self.skipTest("Redis not available for testing")
        
        # Test basic cache operations
        test_key = "test:cache:key"
        test_value = {"test": "data", "number": 42}
        
        # Set cache
        result = self.cache_manager.set(test_key, test_value)
        self.assertTrue(result)
        
        # Get cache
        cached_value = self.cache_manager.get(test_key)
        self.assertEqual(cached_value, test_value)
        
        # Delete cache
        delete_result = self.cache_manager.delete(test_key)
        self.assertTrue(delete_result)
        
        # Verify deletion
        deleted_value = self.cache_manager.get(test_key)
        self.assertIsNone(deleted_value)
    
    def test_session_queries(self):
        """Test various session query methods"""
        # Create test sessions
        drivers = ["Alice", "Bob", "Charlie"]
        session_ids = []
        
        for driver in drivers:
            session_data = self.create_test_session_data(driver)
            file_info = {"filename": f"{driver.lower()}.csv", "size": 1000}
            session_id = self.session_repo.create_session_from_data(session_data, file_info)
            session_ids.append(session_id)
        
        # Test get recent sessions
        recent_sessions = self.session_repo.get_recent_sessions(limit=10)
        self.assertEqual(len(recent_sessions), 3)
        
        # Test get sessions by driver
        alice_sessions = self.session_repo.get_sessions_by_driver("Alice")
        self.assertEqual(len(alice_sessions), 1)
        self.assertEqual(alice_sessions[0].driver.name, "Alice")
        
        # Test get non-existent driver
        empty_sessions = self.session_repo.get_sessions_by_driver("NonExistent")
        self.assertEqual(len(empty_sessions), 0)
    
    def test_lap_and_telemetry_storage(self):
        """Test detailed lap and telemetry point storage"""
        session_data = self.create_test_session_data("Detailed Test")
        file_info = {"filename": "detailed_test.csv", "size": 2000}
        
        session_id = self.session_repo.create_session_from_data(session_data, file_info)
        
        # Retrieve and verify detailed data
        with self.db_manager.get_db_session() as session:
            from models.database_models import Session as DBSession, Lap, TelemetryPoint
            
            db_session = session.query(DBSession).filter(DBSession.id == session_id).first()
            self.assertIsNotNone(db_session)
            
            # Check lap data
            self.assertEqual(len(db_session.laps), 1)
            lap = db_session.laps[0]
            self.assertEqual(lap.lap_number, 1)
            self.assertEqual(lap.lap_time, 65.5)
            self.assertTrue(lap.is_fastest)
            self.assertIsNotNone(lap.max_speed)
            self.assertIsNotNone(lap.avg_speed)
            
            # Check telemetry points
            self.assertEqual(len(lap.telemetry_points), 100)
            first_point = lap.telemetry_points[0]
            self.assertEqual(first_point.timestamp, 0.0)
            self.assertIsNotNone(first_point.speed)
            self.assertIsNotNone(first_point.throttle_pos)
            self.assertIsNotNone(first_point.rpm)
    
    def test_comparison_cache_keys(self):
        """Test comparison cache key generation"""
        # Test fastest lap comparison
        key1 = self.cache_manager.get_comparison_cache_key(1, 2)
        self.assertEqual(key1, "comparison:1:2_fastest")
        
        # Test specific lap comparison  
        key2 = self.cache_manager.get_comparison_cache_key(1, 2, 3, 4)
        self.assertEqual(key2, "comparison:1:2_3_4")
        
        # Test session cache key
        session_key = self.cache_manager.get_session_cache_key(123)
        self.assertEqual(session_key, "session:123")
    
    def test_database_session_context_manager(self):
        """Test database session context manager"""
        # Test successful transaction
        with self.db_manager.get_db_session() as session:
            from models.database_models import Driver
            driver = Driver(name="Context Test Driver")
            session.add(driver)
            # Transaction should commit automatically
        
        # Verify the driver was saved
        with self.db_manager.get_db_session() as session:
            from models.database_models import Driver
            saved_driver = session.query(Driver).filter(Driver.name == "Context Test Driver").first()
            self.assertIsNotNone(saved_driver)
    
    def test_error_handling(self):
        """Test error handling in database operations"""
        # Test getting non-existent session
        non_existent = self.session_repo.get_session_by_id(99999)
        self.assertIsNone(non_existent)
        
        # Test invalid cache operations (should not raise exceptions)
        if self.cache_manager.redis_client:
            # This should handle errors gracefully
            result = self.cache_manager.get("non:existent:key")
            self.assertIsNone(result)

if __name__ == '__main__':
    # Configure SQLite for testing
    os.environ["DATABASE_URL"] = "sqlite:///test_formula4.db"
    
    # Run tests
    unittest.main(verbosity=2) 