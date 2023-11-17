const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const ping = require('ping');
const dns = require('dns');
const shell = require('node-powershell');
const app = express();
const port = 3015;

var cors = require('cors')
app.use(cors())


const printers = {
    25: 'HP-M880 Export',
    26: 'HP-M880 QA',
    27: 'HP-M880 OP',
    28: 'HP-M880 Local',
    29: 'HP-M880 Warehouse',
    30: 'HP-M880 L2 North',
};

let output = [];

const fetchPrinterDetails = async () => {
    let newOutput = [];
    for (let i in printers) {
        let printerDetails = {
            name: printers[i],
            ip: `192.168.0.${i}`
        };
        try {
            const response = await axios.get(`https://192.168.0.${i}/hp/device/InternalPages/Index?id=SuppliesStatus`, { httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) });
            const $ = cheerio.load(response.data);
            printerDetails.tonerLevelBlack = $('#BlackCartridge1-Header_Level').text();
            printerDetails.tonerLevelCyan = $('#CyanCartridge1-Header_Level').text();
            printerDetails.tonerLevelMagenta = $('#MagentaCartridge1-Header_Level').text();
            printerDetails.tonerLevelYellow = $('#YellowCartridge1-Header_Level').text();
            printerDetails.drumLevelBlack = $('#BlackDrumCartridge1-Header_Level').text();
            printerDetails.drumLevelCyan = $('#CyanDrumCartridge1-Header_Level').text();
            printerDetails.drumLevelMagenta = $('#MagentaDrumCartridge1-Header_Level').text();
            printerDetails.drumLevelYellow = $('#YellowDrumCartridge1-Header_Level').text();
            printerDetails.fuserKitLevel = $('#Fuser1-Header_Level').text();
            printerDetails.documentFeederKitLevel = $('#DocumentFeederKit1-Header_Level').text();
        } catch (error) {
            printerDetails.error = error.toString();
        }
        newOutput.push(printerDetails);
    }
    output = newOutput;
};

fetchPrinterDetails();
setInterval(fetchPrinterDetails, 600000); // Fetch printer details every 10 minutes

app.get('/printer/tonerlevel', (req, res) => {

    /*
        [
    {
        "name": "HP-M880 Export",
        "ip": "192.168.0.25",
        "tonerLevelBlack": "2%",
        "tonerLevelCyan": "20%",
        "tonerLevelMagenta": "2%",
        "tonerLevelYellow": "100%",
        "drumLevelBlack": "3%",
        "drumLevelCyan": "",
        "drumLevelMagenta": "2%",
        "drumLevelYellow": "50%",
        "fuserKitLevel": "10%",
        "documentFeederKitLevel": "50%"
    },
    {
        "name": "HP-M880 QA",
        "ip": "192.168.0.26",
        "tonerLevelBlack": "20%",
        "tonerLevelCyan": "50%",
        "tonerLevelMagenta": "2%",
        "tonerLevelYellow": "4%",
        "drumLevelBlack": "80%",
        "drumLevelCyan": "2%",
        "drumLevelMagenta": "2%",
        "drumLevelYellow": "70%",
        "fuserKitLevel": "10%",
        "documentFeederKitLevel": "20%"
    },
    {
        "name": "HP-M880 OP",
        "ip": "192.168.0.27",
        "tonerLevelBlack": "50%",
        "tonerLevelCyan": "40%",
        "tonerLevelMagenta": "2%",
        "tonerLevelYellow": "20%",
        "drumLevelBlack": "2%",
        "drumLevelCyan": "70%",
        "drumLevelMagenta": "6%",
        "drumLevelYellow": "80%",
        "fuserKitLevel": "2%",
        "documentFeederKitLevel": "90%"
    },
    {
        "name": "HP-M880 Local",
        "ip": "192.168.0.28",
        "tonerLevelBlack": "40%",
        "tonerLevelCyan": "40%",
        "tonerLevelMagenta": "10%",
        "tonerLevelYellow": "80%",
        "drumLevelBlack": "60%",
        "drumLevelCyan": "70%",
        "drumLevelMagenta": "10%",
        "drumLevelYellow": "70%",
        "fuserKitLevel": "2%",
        "documentFeederKitLevel": "100%"
    },
    {
        "name": "HP-M880 Warehouse",
        "ip": "192.168.0.29",
        "tonerLevelBlack": "50%",
        "tonerLevelCyan": "30%",
        "tonerLevelMagenta": "80%",
        "tonerLevelYellow": "90%",
        "drumLevelBlack": "",
        "drumLevelCyan": "60%",
        "drumLevelMagenta": "60%",
        "drumLevelYellow": "70%",
        "fuserKitLevel": "30%",
        "documentFeederKitLevel": "100%"
    },
    {
        "name": "HP-M880 L2 North",
        "ip": "192.168.0.30",
        "tonerLevelBlack": "20%",
        "tonerLevelCyan": "60%",
        "tonerLevelMagenta": "80%",
        "tonerLevelYellow": "100%",
        "drumLevelBlack": "30%",
        "drumLevelCyan": "60%",
        "drumLevelMagenta": "100%",
        "drumLevelYellow": "60%",
        "fuserKitLevel": "30%",
        "documentFeederKitLevel": "50%"
    }
]
    */

    res.json(output);
});




app.get('/api/ping', async (req, res) => {
    let hosts = [];
    for(let i = 1; i <= 254; i++) {
        let host = '192.168.0.' + i;
        hosts.push(host);
    }

    let promises = hosts.map(host => {
        return new Promise((resolve, reject) => {
            ping.promise.probe(host)
                .then(function (res) {
                    if(res.alive) {
                        dns.reverse(host, (err, hostnames) => {
                            if(err) {
                                resolve({ip: host, hostname: null, online: res.alive, latency: res.time});
                            } else {
                                resolve({ip: host, hostname: hostnames[0], online: res.alive, latency: res.time});
                            }
                        });
                    } else {
                        resolve({ip: host, online: res.alive});
                    }
                });
        });
    });

    let results = await Promise.all(promises);
    results = results.filter(result => result !== null);
    res.json(results);
});




app.listen(port, () => console.log(`Server running on port ${port}`));
