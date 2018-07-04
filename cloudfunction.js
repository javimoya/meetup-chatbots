'use strict';

const http = require('http');
const functions = require('firebase-functions');
const { WebhookClient } = require('dialogflow-fulfillment');
const { Card, Suggestion } = require('dialogflow-fulfillment');
const vision = require('@google-cloud/vision');
const language = require('@google-cloud/language');
var rp = require('request-promise');
const storage = require('@google-cloud/storage')();

const host = 'api.worldweatheronline.com';
const wwoApiKey = '<worldweatheronline API KEY>';

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({
        request,
        response
    });
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

    function welcome(agent) {
        agent.add(`Hola a todos!`);
    }

    function fallback(agent) {
        agent.add(`No entendí!!`);
        agent.add(`Lo siento, puedes intentar de nuevo?`);
    }

    function formatDate(date) {
        var d = new Date(date),
            month = '' + (d.getMonth() + 1),
            day = '' + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [year, month, day].join('-');
    }


    // Uncomment and edit to make your own intent handler
    // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
    // below to get this function to be run when a Dialogflow intent is matched
    function weather(agent) {
        // Get the city and date from the request
        let city = agent.parameters['geo-city']; // city is a required param

        // Get the date for the weather forecast (if present)
        let date = '';
        if (agent.parameters['date']) {
            date = formatDate(agent.parameters['date']);
            console.log('Date: ' + date);
        }

        // Call the weather API
        return callWeatherApi(city, date).then((output) => {
            //res.json({ 'fulfillmentText': output }); // Return the results of the weather API to Dialogflow
            agent.add(output);
            return Promise.resolve(agent);
        }).catch(() => {
            agent.add(`I don't know the weather but I hope it's good!`);
            return Promise.resolve(agent);
            //res.json({ 'fulfillmentText': `I don't know the weather but I hope it's good!` });
        });


        //agent.add(new Suggestion(`Quick Reply`));
        //agent.add(new Suggestion(`Suggestion`));
        //agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
        //agent.add(`${unitCurrencyAmount} ${unitCurrencyCurrency} a ${currencyName} son ${valor}`);
    }

    function callWeatherApi(city, date) {
        return new Promise((resolve, reject) => {
            // Create the path for the HTTP request to get the weather
            let path = '/premium/v1/weather.ashx?format=json&lang=es&num_of_days=1' +
                '&q=' + encodeURIComponent(city) + '&key=' + wwoApiKey + '&lang=es&date=' + date;
            console.log('API Request: ' + host + path);

            // Make the HTTP request to get the weather
            http.get({
                host: host,
                path: path
            }, (res) => {
                let body = ''; // var to store the response chunks
                res.on('data', (d) => {
                    body += d;
                }); // store each response chunk
                res.on('end', () => {
                    // After all the data has been received parse the JSON for desired data
                    let response = JSON.parse(body);
                    let forecast = response['data']['weather'][0];
                    let location = response['data']['request'][0];
                    let conditions = response['data']['current_condition'][0];
                    let currentConditions = conditions['weatherDesc'][0]['value'];

                    // Create response
                    let output = `Las condiciones en ${location['type']} 
        ${location['query']} son ${currentConditions} con una temperatura máxima de
        ${forecast['maxtempC']}°C y mínima de 
        ${forecast['mintempC']}°C el
        ${forecast['date']}.`;

                    // Resolve the promise with the output text
                    console.log(output);
                    resolve(output);
                });
                res.on('error', (error) => {
                    console.log(`Error calling the weather API: ${error}`)
                    reject();
                });
            });
        });
    }

    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    intentMap.set('weather', weather);
    intentMap.set('weather.context', weather);
    
 
    agent.add('v3');
    // intentMap.set('your intent name here', yourFunctionHandler);
    // intentMap.set('your intent name here', googleAssistantHandler);
    agent.handleRequest(intentMap);
});
