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
