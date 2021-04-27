DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS weather;
DROP TABLE IF EXISTS parks;

CREATE TABLE locations (
id SERIAL PRIMARY KEY,
search_query VARCHAR(200),
formatted_query VARCHAR(200),
latitude FLOAT,
longitude FLOAT
);

CREATE TABLE weather (
id SERIAL PRIMARY KEY,
forecast VARCHAR(255),
time VARCHAR(200),
location_id VARCHAR(200)
);

CREATE TABLE park (
id SERIAL PRIMARY KEY,
name VARCHAR(200),
address VARCHAR(200),
fee INTEGER,
description VARCHAR(250),
url VARCHAR(200),
location_id VARCHAR(200)
);