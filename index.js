
import hue from 'node-hue-api'
import darkSky from 'dark-sky'
import moment from 'moment'
import config from 'config.js'
import winston from 'winston'

// Hue API const and initialization
const hueApi = new hue.HueApi(config.hue.ip, config.hue.user)
const darkSky = new DarkSky(config.darkSky.key) 
const latLng = config.latLng

var weatherData = {}
var bridgeData = {}
var currentTime = null
var lightsOnTime = null
var lightsOffTime = null
var sunriseTime = null

var lightStateObject = hue.lightState.create()

// setup the connection to the Hue bridge. 
hueApi.config()

//returns a bool of the current time being beteen on/off times
function betweenOnAndOff() {
  return currentTime.isBetween(lightsOnTime, lightsOffTime)
}

//returns true if the sun is up
function sunIsUp() {
  return currentTime.isBetween(sunriseTime, lightsOnTime)
}
//returns true if the clouds cover 2/3 of the sky
function cloudyOutside() {
  return (weatherData.cloudCover >= .66)
}

//gets all the lights in the bridge
function getLights() {
  return hueApi.lights()
}

//returns simplified lightState of all the lights, including their id, if it's on/off, and the brightness value (0-255)
async function getLightStates() {
  var myLights = await getLights()
  myLights = myLights.lights

  var lightStates = null

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

//Turns the lights on
async function turnLightsOn() {
  var lights = await getLightStates()
  var lightsTurnedOn = {}

  for ( const light of Object.values(lights) ) {
    if (!light.lightOn) {
      hueApi.setLightState( light.id, lightStateObject.on() ).then( res => {
        console.log("Turned on light " + light.id )
        lightsTurnedOn[light.id] = true
      }).catch( res => {
        console.log(res)
        lightsTurnedOn[light.id] = false
      })
    }
    else {
      console.log("Light " + light.id + " is already on!")
      lightsTurnedOn[light.id] = null
    }
  }
  
  //TODO: if there are valse values in the lightsTurnedOn Object, reject the promise
  return Promise.resolve(true)
}

async function updateTimeWeather() {

  //update the time
  currentTime = moment()

  //set LightsOffTime to 11:30PM (23:30)
  lightsOffTime = currentTime
  lightsOffTime.hour(23)
  lightsOffTime.minute(30) 
  
  return await darkSky
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

async function mainLoop() {
  await updateTimeWeather().then(function() {
    if (betweenOnAndOff() || (cloudyOutside() && sunIsUp() ) ) {
      turnLightsOn()
    }
  }).catch(function(error){
    console.log(error)
  })
}

mainLoop();

//TODO write setInterval function
//change conosle logs to winston logs, log to stdout and logfiles