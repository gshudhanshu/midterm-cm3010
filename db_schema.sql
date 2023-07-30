-- Drop the existing database if it exists
DROP DATABASE IF EXISTS `listingdb`;

-- Create the database
CREATE DATABASE `listingdb`;

-- Use the database
USE `listingdb`;


-- Create the table listing_url
CREATE TABLE listing_url (
  listing_url_id int NOT NULL AUTO_INCREMENT,
  listing_url varchar(255) NULL,
  picture_url varchar(255) NULL,
  PRIMARY KEY (listing_url_id)
);


-- Create the table host_url
CREATE TABLE host_url (
  host_url_id int NOT NULL AUTO_INCREMENT,
  host_url varchar(255) NULL,
  host_picture_url varchar(255) NULL,
  PRIMARY KEY (host_url_id)
);

-- Create the table host_location
CREATE TABLE host_location (
  host_location_id int NOT NULL AUTO_INCREMENT,
  host_location varchar(255) NULL,
  PRIMARY KEY (host_location_id)
);

-- Create the table host
CREATE TABLE host (
  host_id int NOT NULL AUTO_INCREMENT,
  host_name varchar(255) NOT NULL,
  host_about text(1000) NOT NULL,
  host_neighbourhood varchar(255) NOT NULL,
  host_total_listings_count tinyint UNSIGNED NULL,
  host_url_id int NOT NULL,
  host_location_id int NOT NULL,
  PRIMARY KEY (host_id),
  FOREIGN KEY (host_url_id) REFERENCES host_url(host_url_id),
  FOREIGN KEY (host_location_id) REFERENCES host_location(host_location_id)
);


-- Create the table neighborhood
CREATE TABLE neighborhood (
  neighborhood_id int NOT NULL AUTO_INCREMENT,
  neighborhood varchar(255) NULL,
  PRIMARY KEY (neighborhood_id)
);

-- Create the table geo_location
CREATE TABLE geo_location (
  geo_location_id int NOT NULL AUTO_INCREMENT,
  latitude decimal(10,8) NULL,
  longitude decimal(11,8) NULL,
  PRIMARY KEY (geo_location_id)
);

-- Create the property_type table
CREATE TABLE property_type (
  property_type_id int NOT NULL AUTO_INCREMENT,
  property_type varchar(255) NULL,
  PRIMARY KEY (property_type_id)
);

-- Create the table room_type
CREATE TABLE room_type (
  room_type_id int NOT NULL AUTO_INCREMENT,
  room_type varchar(255) NULL,
  PRIMARY KEY (room_type_id)
);

-- Create the table amenities
CREATE TABLE amenity (
  amenity_id int NOT NULL AUTO_INCREMENT,
  amenity varchar(255) UNIQUE NULL,
  PRIMARY KEY (amenity_id)
);

-- Create the table review
CREATE TABLE review (
    review_id int NOT NULL AUTO_INCREMENT,
    number_of_reviews int NOT NULL,
    review_scores_rating int NOT NULL,
    PRIMARY KEY (review_id)
);

-- Create the table listing
CREATE TABLE listing (
  listing_id int NOT NULL AUTO_INCREMENT,
  name varchar(255) NOT NULL,
  description text(1000) NOT NULL,
  neighborhood_overview text(1000) NOT NULL,
  accommodates tinyint UNSIGNED NULL,
  bedrooms tinyint UNSIGNED NULL,
  beds tinyint UNSIGNED NULL,
  bathrooms_text varchar(255) NULL,
  availability_365 int NULL,
  price int NOT NULL,
  listing_url_id int NOT NULL,
  host_id int NOT NULL,
  neighborhood_id int NOT NULL,
  geo_location_id int NOT NULL,
  property_type_id int NOT NULL,
  room_type_id int NOT NULL,
  PRIMARY KEY (listing_id),
  FOREIGN KEY (listing_url_id) REFERENCES listing_url(listing_url_id),
  FOREIGN KEY (neighborhood_id) REFERENCES neighborhood(neighborhood_id),
  FOREIGN KEY (geo_location_id) REFERENCES geo_location(geo_location_id),
  FOREIGN KEY (property_type_id) REFERENCES property_type(property_type_id),
  FOREIGN KEY (room_type_id) REFERENCES room_type(room_type_id),
  FOREIGN KEY (host_id) REFERENCES host(host_id)
);

-- Create the amenity junction table
CREATE TABLE listing_amenity_junction (
  listing_amenity_id int NOT NULL AUTO_INCREMENT,
  listing_id int NOT NULL,
  amenity_id int NOT NULL,
  PRIMARY KEY (listing_amenity_id),
  FOREIGN KEY (listing_id) REFERENCES listing(listing_id),
  FOREIGN KEY (amenity_id) REFERENCES amenity(amenity_id)
);