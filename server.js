'use strict';
const express = require('express');

require('dotenv').config();

const cors = require('cors');
const pg = require('pg');
const server = express();
const superagent = require('superagent');
const PORT = process.env.PORT || 2000;
// const client = new pg.Client(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
server.use(cors());


server.get('/', handledRouter);
server.get('/location', handledLocation);
server.get('/movies', handledMovies);
server.get('/yelp', handledYelp);
server.get('/weather', handledWeather);
server.get('/Parks', handledParks);
server.get('*', handledError);



function handledRouter(req, res) {
    res.send('your server is working');
}


function handledLocation(req, res) {

    let cityNameData = req.query.city;
    let key = process.env.LOCATION_KEY;
    let LocURL = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${cityNameData}&format=json`;
    superagent.get(LocURL)
        .then(getData => {
            let gData = getData.body;
            const newLocationData = new Location(cityNameData, gData);
            let SQL = 'SELECT * FROM locations WHERE search_query=$1;';
            let savaData = [cityNameData];
            client.query(SQL, savaData).then(result => {
                if (result.rowCount) {
                    res.send(result.rows[0]);
                }
                else {
                    let city = newLocationData.search_query;
                    let discription = newLocationData.formatted_query;
                    let lat = newLocationData.latitude;
                    let lon = newLocationData.longitude;
                    SQL = 'INSERT INTO locations (search_query,formatted_query,latitude,longitude) VALUES ($1,$2,$3,$4) RETURNING *;';
                    let locationSafeValues = [city, discription, lat, lon];
                    client.query(SQL, locationSafeValues)
                        .then(result => {
                            res.send(result.rows[0]);
                        });
                }
            });

        })


        .catch(error => {
            console.log('Error in getting data from LocationIQ server');
            console.error(error);
            res.send(error);


        });


}



function handledMovies(req, res) {


    let key = process.env.MOVIES_KEY;

    let moviesURl = `https://api.themoviedb.org/3/trending/movie/day?api_key=${key}`;

    superagent.get(moviesURl)
        .then(getData => {

            let newArr = getData.body.results.map(element => {

                return new Movies(element);
            });
            res.send(newArr);

        }
        );
}

let page = 1;
function handledYelp(req, res) {

    let city = req.query.search_query;
    const numPerPage = 5;
    let start = ((page - 1) * numPerPage + 1);
    let key = process.env.YELP_KEY;

    let yelpURL = `https://api.yelp.com/v3/businesses/search?location=${city}&limit=${numPerPage}&offset=${start};`;

    superagent.get(yelpURL).set('Authorization', `Bearer ${key}`)
        .then(getData => {
            console.log(getData.body);
            let newArr = getData.body.businesses.map(element => {
                return new Yelp(element);
            });
            res.send(newArr);
        }
        );
    page++;
}

function handledWeather(req, res) {


    let lat = req.query.latitude;
    let lon = req.query.longitude;
    let key = process.env.WEATHER_KEY;
    let weathersURL = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${lat}&lon=${lon}&days=10&key=${key}`;

    superagent.get(weathersURL)
        .then(getData => {
            let newArr = getData.body.data.map(element => {
                return new Weathers(element);
            });
            res.send(newArr);
        }

        );
}




function handledParks(req, res) {
    let key = process.env.PARK_KEY;
    let cityName = req.query.search_query;
    let parkURL = `https://developer.nps.gov/api/v1/parks?q=${cityName}&limit=10&api_key=${key}`;
    superagent.get(parkURL)
        .then(getData => {
            let newArr = getData.body.data.map(element => {
                return new Park(element);
            });
            res.send(newArr);
        }
        );
}

function handledError(req, res) {
    {
        let errObj = {
            status: 500,
            responseText: 'Sorry, something went wrong'
        };
        res.status(500).send(errObj);
    }
}




function Location(cityName, getData) {
    this.search_query = cityName;
    this.formatted_query = getData[0].display_name;
    this.latitude = getData[0].lat;
    this.longitude = getData[0].lon;
}

function Movies(moviesData) {
    this.title = moviesData.title;
    this.overview = moviesData.overview;
    this.average_votes = moviesData.vote_average;
    this.total_votes = moviesData.total_votes;
    this.image_url = `https://image.tmdb.org/t/p/w500${moviesData.poster_path}`;
    this.popularity = moviesData.popularity;
    this.released_on = moviesData.release_date;
}

function Yelp(yelpData) {
    this.name = yelpData.name;
    this.image_url = yelpData.image_url;
    this.price = yelpData.price;
    this.rating = yelpData.rating;
    this.page = yelpData.pages;
}



function Weathers(weatherData) {

    this.forecast = weatherData.weather.description;
    this.time = weatherData.valid_date;
}

function Park(getData) {
    this.name = getData.fullName;
    this.address = getData.addresses[0].line1;
    this.fee = getData.fees;
    this.description = getData.description;
    this.url = getData.url;
}



client.connect()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`Listening on PORT ${PORT}`);

        });
    });
