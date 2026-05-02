CREATE USER 'airlineapp'@'localhost' 
IDENTIFIED BY 'airline123';
GRANT ALL PRIVILEGES ON AirlineDB.* TO 'airlineapp'@'localhost';
FLUSH PRIVILEGES;