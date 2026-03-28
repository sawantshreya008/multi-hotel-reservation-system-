CREATE DATABASE IF NOT EXISTS hotel_reservation;
USE hotel_reservation;

DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS seats;
DROP TABLE IF EXISTS hotels;

CREATE TABLE hotels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    image_url TEXT,
    description TEXT,
    rating DECIMAL(2,1)
);

CREATE TABLE seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    table_number INT NOT NULL,
    seat_number INT NOT NULL, 
    shape VARCHAR(50) DEFAULT 'circular', 
    capacity INT DEFAULT 6,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seat_id INT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    special_request TEXT,
    date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE,
    UNIQUE KEY unique_reservation (seat_id, date, time_slot)
);

-- Insert 6 Hotels in Mumbai
INSERT INTO hotels (name, location, image_url, description, rating) VALUES 
('The Taj Mahal Palace', 'Colaba, Mumbai, India', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', 'Now enjoy premium dining overlooking the Gateway of India with exquisite seating and majestic views.', 4.9),
('Trident Nariman Point', 'Nariman Point, Mumbai, India', 'https://images.unsplash.com/photo-1551882547-ff40c0d5b9af?w=800', 'Enjoy fine dining at Mumbai''s most iconic sea-facing restaurant. Featuring authentic Italian cuisine.', 4.7),
('The Oberoi', 'Nariman Point, Mumbai, India', 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800', 'Opulent surroundings and Michelin-star equivalent chefs providing an exclusive private dining experience.', 4.8),
('ITC Maratha', 'Andheri, Mumbai, India', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', 'A blend of grand architecture and fine dining. Specializes in luxury Peshawari and Dum Pukht cuisine.', 4.6),
('Sahara Star', 'Vile Parle, Mumbai, India', 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=800', 'Dine under the world''s largest pillarless clear-to-sky dome. Features global cuisine.', 4.5),
('Novotel Juhu Beach', 'Juhu, Mumbai, India', 'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=800', 'Beachfront views, open-air seating, and stunning sunsets. The perfect romantic dining destination in Mumbai.', 4.4);

-- Insert Seats for Hotel 1 (Taj Mahal)
INSERT INTO seats (hotel_id, table_number, seat_number, shape, capacity) VALUES 
(1, 1, 1, 'circular', 6), (1, 1, 2, 'circular', 6), (1, 1, 3, 'circular', 6), (1, 1, 4, 'circular', 6), (1, 1, 5, 'circular', 6), (1, 1, 6, 'circular', 6),
(1, 2, 1, 'rectangle', 4), (1, 2, 2, 'rectangle', 4), (1, 2, 3, 'rectangle', 4), (1, 2, 4, 'rectangle', 4),
(1, 3, 1, 'circular', 6), (1, 3, 2, 'circular', 6), (1, 3, 3, 'circular', 6), (1, 3, 4, 'circular', 6), (1, 3, 5, 'circular', 6), (1, 3, 6, 'circular', 6),
(1, 4, 1, 'rectangle', 2), (1, 4, 2, 'rectangle', 2);

-- Insert Seats for Hotel 2 (Trident)
INSERT INTO seats (hotel_id, table_number, seat_number, shape, capacity) VALUES 
(2, 1, 1, 'circular', 4), (2, 1, 2, 'circular', 4), (2, 1, 3, 'circular', 4), (2, 1, 4, 'circular', 4),
(2, 2, 1, 'circular', 4), (2, 2, 2, 'circular', 4), (2, 2, 3, 'circular', 4), (2, 2, 4, 'circular', 4),
(2, 3, 1, 'rectangle', 6), (2, 3, 2, 'rectangle', 6), (2, 3, 3, 'rectangle', 6), (2, 3, 4, 'rectangle', 6), (2, 3, 5, 'rectangle', 6), (2, 3, 6, 'rectangle', 6);

-- Hotel 3
INSERT INTO seats (hotel_id, table_number, seat_number, shape, capacity) VALUES 
(3, 1, 1, 'circular', 6), (3, 1, 2, 'circular', 6), (3, 1, 3, 'circular', 6), (3, 1, 4, 'circular', 6), (3, 1, 5, 'circular', 6), (3, 1, 6, 'circular', 6);
-- Hotel 4
INSERT INTO seats (hotel_id, table_number, seat_number, shape, capacity) VALUES 
(4, 1, 1, 'rectangle', 4), (4, 1, 2, 'rectangle', 4), (4, 1, 3, 'rectangle', 4), (4, 1, 4, 'rectangle', 4);
-- Hotel 5
INSERT INTO seats (hotel_id, table_number, seat_number, shape, capacity) VALUES 
(5, 1, 1, 'circular', 8), (5, 1, 2, 'circular', 8), (5, 1, 3, 'circular', 8), (5, 1, 4, 'circular', 8), (5, 1, 5, 'circular', 8), (5, 1, 6, 'circular', 8), (5, 1, 7, 'circular', 8), (5, 1, 8, 'circular', 8);
-- Hotel 6
INSERT INTO seats (hotel_id, table_number, seat_number, shape, capacity) VALUES 
(6, 1, 1, 'circular', 2), (6, 1, 2, 'circular', 2),
(6, 2, 1, 'rectangle', 4), (6, 2, 2, 'rectangle', 4), (6, 2, 3, 'rectangle', 4), (6, 2, 4, 'rectangle', 4);
