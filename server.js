'use strict';

const experss = require( 'express' );
const cors = require( 'cors' );
require( 'dotenv' ).config();
const superagent = require( 'superagent' );
const { Client } = require( 'pg' );

//init pg clinet
const client = new Client( {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
} );

const app = experss();

const PORT = process.env.PORT || 5000;

// location constructor
function Location( data ) {
  this.search_query = data.search_query;
  this.formatted_query = data.formatted_query;
  this.latitude = data.latitude;
  this.longitude = data.longitude;
}

// weather constructor
function Weather( data ) {
  this.forecast = data.weather.description;
  this.time = new Date( data.datetime ).toString().slice( 0, 15 );
}

// park constructor
function Park( data ) {
  this.name = data.fullName;
  this.address = Object.values( data.addresses[0] ).join( ', ' );
  this.fee = data.fees[0] || 0;
  this.description = data.description;
  this.url = data.url;
}

// Middlewares
app.use( cors() );
app.use( logger );

// Routes
app.get( '/location' , handleLocation );
app.get( '/weather' , handleWeather );
app.get( '/parks' , handleParks );

// Errors handler
app.use( handleError );

// Logger middleware
function logger( req, res, next ) {
  console.log( `Time: ${Date.now()}, Requested method: ${req.method}, Requested url: ${req.originalUrl}` );
  next();
}

// function to handle location end point
function handleLocation ( req, res, next ) {
  let searchQuery = req.query.city;

  getLocationData( searchQuery )
    .then( response => res.status( 200 ).send( response ) )
    .catch( next );
}

// function to handle weather end point
function handleWeather ( req, res, next ) {
  let latitude = req.query.latitude;
  let longitude = req.query.longitude;

  superagent
    .get( 'https://api.weatherbit.io/v2.0/forecast/daily' )
    .query( { key: process.env.WEATHER_API_KEY } )
    .query( { lat: latitude } )
    .query( { lon: longitude } )
    .then( response => {
      let resultArr = response.body.data.map( item => new Weather( item ) );
      res.status( 200 ).send( resultArr );
    } )
    .catch( next );
}

// function to handle park end point
function handleParks ( req, res, next ) {
  let searchQuery = req.query.search_query;

  superagent
    .get( 'https://developer.nps.gov/api/v1/parks' )
    .query( { api_key: process.env.PARKS_API_KEY } )
    .query( { q: searchQuery } )
    .query( { limit: 10 } )
    .then( response => {
      let resultArr = response.body.data.map( item => new Park( item ) );
      res.status( 200 ).send( resultArr );
    } )
    .catch( next );
}

// function to handle errors
function handleError ( err, req, res, next ) {
  console.error( err.stack );
  let response = {
    status: err.status || 500,
    responseText: err.message,
  };

  res.status( err.status || 500 ).send( response );
}

////////////////////////////////////////////////////////////////////////////////////////////

// function to ge the location data
function getLocationData( searchQuery ) {

  // checking the database for location information
  let query = 'SELECT * FROM locations WHERE search_query=$1';
  return client
    .query( query, [searchQuery] )
    .then( dbRespnse => {
      if( dbRespnse.rowCount > 0 ) return new Location( dbRespnse.rows[0] );
      else {
        return getLocaionInfoFromApi( searchQuery )
          .then( apiResponse => apiResponse )
          .catch( e => { throw e; } );
      }
    } )
    .catch( e => { throw e; } );
}

// function to get location info from api
function getLocaionInfoFromApi( searchQuery ) {
  return superagent
    .get( 'https://eu1.locationiq.com/v1/search.php' )
    .query( { key: process.env.GEOCODE_API_KEY } )
    .query( { q: searchQuery } )
    .query( { format: 'json' } )
    .then( response => {
      let setLocationQuery = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING id, search_query, formatted_query, latitude, longitude;';
      return client
        .query( setLocationQuery, [searchQuery, response.body[0].display_name, response.body[0].lat, response.body[0].lon] )
        .then( insertResponse => {
          let locationObj = new Location( insertResponse.rows[0] );
          return locationObj;
        } )
        .catch( e => {throw e;} );
    } )
    .catch( e => {throw e;} );
}

// connect to database and start the server
client
  .connect()
  .then( () => {
    app.listen( PORT, () => console.log( `Listening on port ${PORT}` ) );
  } )
  .catch( e => console.log( e ) );

