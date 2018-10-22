#! /usr/bin/env node

/*
* @todo: Add winston logging instead of console.log
* @todo: Add google firebase cloud function to store logs in firebase data store.
*
*/

import DarkSky from 'dark-sky'
import hue from 'node-hue-api'
import moment from 'moment'
//import winston from 'winston'
import config from './config.js'

// API and config variables
const hueApi = new hue.HueApi(config.hue.ip, config.hue.user)
const darkSkyAPI = new DarkSky(config.darkSky.key)
const latLng = config.latLng
const intervalTime = config.time

var weatherData = {}
var bridgeData = {}
var currentTime = null
var lightsOnTime = null
var lightsOffTime = null
var sunriseTime = null

var lightStateObject = hue.lightState.create()

// setup the connection to the Hue bridge. 
hueApi.config()

/**
 * betweenOnAndOff() 
 * 
 * @param: none
 * @returns: Boolean. True if the current time is between lightsOnTime and lightsOffTime
 */
function betweenOnAndOff() {
  return currentTime.isBetween(lightsOnTime, lightsOffTime)
}

/**
 * cloudyOutside
 *
 * @returns Boolean. True if the cloud cover is greater than 66% (two/thirds)
 */
function cloudyOutside() {
  return (weatherData.cloudCover >= 0.66)
}


/**
 * getLights
 *
 * @returns Object. The lights object from the hueAPI
 */
function getLights() {
  return hueApi.lights()
}

/**
 * getLightStates
 *
 * @returns Promise. The promise resolves the lightStates array of light simplified light state objects
 */
async function getLightStates() {
  var myLights = await getLights()
  var lightStates = null

  // grab the actual lights inside of myLights
  myLights = myLights.lights

  // for each light, grab the state, build a simplified light state object, and store it in lightStates
  for ( const light of myLights ) {
    var state = await hueApi.lightStatus(light.id)
    state = state.state
    lightStates['light' + light.id] = {
      "id": light.id,
      "lightOn": state.on,
      "brightness": state.bri
    }
  }

  return Promise.resolve(lightStates)
}

//returns true if the sun is up
/**
 * sun is up
 *
 * @returns Boolean. True if the time is between sunrise and 1 hour before sunset
 */
function sunIsUp() {
  return currentTime.isBetween(sunriseTime, lightsOnTime)
}


/**
 * turnLightsOn
 *
 * @returns Promise. Resolves to true
 * @todo If there are false values in the lightsTurnedOn Object, reject the promise
 */
async function turnLightsOn() {
  var lights = await getLightStates()
  var lightsTurnedOn = {}

  // cache Object.values()
  lights = Object.values(lights)

  // for each light in lights, if the light is off, attempt to turn it on  and handle any errors.
  for ( const light of lights ) {
    // if light is not on , attempt to set the light state.
    if (!light.lightOn) {
      hueApi.setLightState( light.id, lightStateObject.on() ).then( res => {
        console.log("Turned on light " + light.id )
        lightsTurnedOn[light.id] = true
      }).catch( res => {
        console.log(res)
        lightsTurnedOn[light.id] = false
      })
    // Otherwise, the light is already on.   
    } else {
      console.log("Light " + light.id + " is already on!")
      lightsTurnedOn[light.id] = null
    }
  }

  return Promise.resolve(true)
}

/**
 * updateTimeWeather
 *
 * @returns A Promise passed from the darkSkyApi
 */
async function updateTimeWeather() {

  //update the time
  currentTime = moment()

  //set LightsOffTime to 11:30PM (23:30)
  lightsOffTime = currentTime
  lightsOffTime.hour(23)
  lightsOffTime.minute(30) 
  
  return await darkSkyAPI
    .latitude(latLng.lat)
    .longitude(latLng.lng)
    .time(currentTime)
    .units('us')
    .exclude( 'minutely, hourly, alerts, flags' )
    .get()
    .then( res => {
      //save the current weather data
      weatherData = res.currently

      //get the sunrise time
      sunriseTime = moment.unix(res.daily.data[0].sunriseTime)

      //adjust the lights on time to 1 hour before sunset
      lightsOnTime = moment.unix(res.daily.data[0].sunsetTime)
      lightsOnTime = moment(lightsOnTime).subtract(1, 'hour')    
    })
}

/**
 * mainLoop
 * 
 * @description Runs the code. Updates the global time and weather, 
 * then turns lights on if it is the propertime or weather conditions
 *
 */
async function mainLoop() {
  await updateTimeWeather().then(function() {
    if (betweenOnAndOff() || (cloudyOutside() && sunIsUp() ) ) {
      turnLightsOn()
    }
  }).catch(function(error){
    console.log(error)
  })
}

(function () {
  mainLoop()
  setInterval(mainLoop, intervalTime)
})