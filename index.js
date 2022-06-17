const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const express = require("express");
const cors = require('cors');

const countryDataURL = "https://www.mohfw.gov.in/";
const stateDataURL = "https://www.mohfw.gov.in/data/datanew.json"

const port = 4000;
const app = express();
app.use(cors());
app.use(express.json());

const expirationTime = 5  // minutes;

const covidData = {
    countryData : {},
    stateData : {}
};

const extractFirstNumber = (s) => s.split('(')[0];
const extractSecondNumber = (s) => s.split('(')[1].slice(0,-1);

async function getCountryData() {
    let countryData = [];
    try {
        const { data } = await axios.get(countryDataURL);
        const $ = cheerio.load(data);
        const statsDiv = $(".site-stats-count");
        const dataArr = $(statsDiv).children("ul").children("li").children(".mob-show").children("strong");
        dataArr.each((i, el) => {
            countryData.push($(el).text());
        });
    }
    catch (e) {
        console.log(`Error scraping the country data: ${e} `);
    }
      
    covidData.countryData = {
        lastFetched : Math.floor(Date.now()/60000),
        data: {
            "active": extractFirstNumber(countryData[0]),
            "cured": extractFirstNumber(countryData[1]),
            "deaths": extractFirstNumber(countryData[2]),
            "new_active": extractSecondNumber(countryData[0]),
            "new_cured": extractSecondNumber(countryData[1]),
            "new_death": extractSecondNumber(countryData[2]),
        } 
    };   
}

async function getStateData() {
    try {
        const { data } = await axios.get(stateDataURL);
        covidData.stateData = {
            lastFetched : Math.floor(Date.now()/60000),
            data
        };
    } catch (e) {
        console.log(`Error while fetching state wise data: ${e}`);
    }
}

//Web API
app.get('/data', async (req, res) => {
    console.log('Received request to fetch covid data ')
    try {
        const currTime = Math.floor(Date.now()/60000);
        if ( 
            !covidData.countryData.data || 
            (   covidData.countryData.currTime && 
                currTime - covidData.countryData.lastFetched > expirationTime 
            )
        )
            await getCountryData();
        
        if ( 
            !covidData.stateData.data || 
            ( covidData.stateData.currTime && 
              currTime - covidData.stateData.lastFetched > expirationTime
            )
        )
            await getStateData();
        
        res.send(covidData);
    } catch (e) {
        res.status(500).json(e);
    }
    

});

app.listen(port, () =>
{   
    getCountryData();
    getStateData();
    console.log(`Server running, listening request on port ${port}`)
});


