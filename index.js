const express = require('express');
const asyncHandler = require('express-async-handler');

var request = require('request');
require('custom-env').env('dev');
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
require("tls").DEFAULT_MIN_VERSION = "TLSv1";

if (process.env.NODE_ENV !== 'production') { require ('custom-env').env('dev') }
process.on('uncaughtException', function (err) {
	console.error(err);
	console.log("Node NOT Exiting...");
});

const app = express();
//const port = process.env.PORT || 3001;


const base64XSJSCredential = Buffer.from(process.env.XSJS_USERNAME + ":" + process.env.XSJS_PASSWORD).toString('base64');


app.use(express.json());
app.use(function (req, res, next) {
    let allowedOrigins = ["http://localhost:8080",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:8082",
    "http://localhost:8083",
    "http://localhost:8084",
    "http://localhost:8085",
     "http://localhost:8085",
     "http://127.0.0.1:5500",
    "https://test-app-realestate.netlify.app",
    "https://app-realestate.netlify.app"];
    let origin = req.headers.origin;
     
     if (allowedOrigins.includes(origin)) {
         res.setHeader('Access-Control-Allow-Origin', origin);
     }
     res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
     res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
     res.setHeader('Access-Control-Allow-Credentials', true);
     next();
 });

const loginOptionSAP = {
    'method': 'POST',
    'url': process.env.SL_BASE_URL + '/Login',
    'headers': {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        "CompanyDB": process.env.SL_DB,
        "Password": process.env.SL_PASSWORD,
        "UserName": process.env.SL_USERNAME
    })
};

const loginSAP = async () => {
    return new Promise((resolve, reject) => {
        request(loginOptionSAP, (logerror, logresponse) => {
            if (logerror) resolve(logerror);
            resolve(logresponse.headers["set-cookie"]);
        });
    });
};

let postAR = async (cookie, body) => {
    var postAROption = {};
    postAROption.method = "POST";
    postAROption.url = `${process.env.SL_BASE_URL}/Invoices`;
    postAROption.headers = {
        "Content-Type": "application/json",
        "Cookie": cookie
    };
    postAROption.body = JSON.stringify(body);

    return new Promise((resolve, reject) => {
        request(postAROption, (err, resp) => {
            if (err) resolve({
                error: "-1005",
                errorDesc: JSON.stringify(err)
            });
            if (JSON.parse(resp.body).error) {
                console.log(JSON.stringify(JSON.parse(resp.body)));
                resolve({
                    error: "-1006",
                    errorDesc: JSON.stringify(JSON.parse(resp.body).error)
                });
            } else {
                resolve(resp);
            }

        })
    })
}

//A/R Invoice Posting in SAP
app.post('/postARInvoice', asyncHandler(async (req, res, next) => {
    try {
        
        console.log("Logging in...");
        let gotCookie = await loginSAP();
        var DocumentLines = JSON.parse(JSON.stringify(req.body.DocumentLines));
        var arLines = [];
        for (let p = 0; p < DocumentLines.length; p++) {
            var arDocLine = {};
            arDocLine.ItemCode = req.body.DocumentLines[p].ItemCode;
            arDocLine.Quantity = req.body.DocumentLines[p].Quantity;
            arDocLine.TaxCode = req.body.DocumentLines[p].TaxCode;
            arDocLine.UnitPrice = req.body.DocumentLines[p].UnitPrice;
            arDocLine.AccountCode = req.body.DocumentLines[p].AccountCode;  
            arDocLine.BaseType = req.body.DocumentLines[p].BaseType;
            arDocLine.BaseEntry = req.body.DocumentLines[p].BaseEntry;
            arDocLine.BaseLine = req.body.DocumentLines[p].BaseLine;

            arLines.push(JSON.parse(JSON.stringify(arDocLine)));
        }
        var oARInvoice = {};
        oARInvoice.CardCode = req.body.CardCode;
        oARInvoice.DocDate = req.body.DocDate;
        oARInvoice.DocDueDate = req.body.DocDueDate;
        // oARInvoice.AccountCode = req.body.AccountCode;
        oARInvoice.ControlAccount = req.body.ControlAccount;
        oARInvoice.Comments = req.body.Comments;
        oARInvoice.U_APP_ReserveNum = req.body.U_APP_ReserveNum;
        oARInvoice.U_APP_ContractNum = req.body.U_APP_ContractNum;
        oARInvoice.DocumentLines = arLines;
       
        console.log(JSON.stringify(oARInvoice))
        let resultAR = await postAR(gotCookie, oARInvoice);
        res.send(JSON.stringify(resultAR));
    } catch (e) {
        return next(e);
    }
}))



app.get('/Connected', (request, response) => {
    response.status(200).send("true"); 
    

});
//app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
app.set( 'port', ( process.env.PORT || 4001 ));
app.listen( app.get( 'port' ), function() {
	console.log( 'Node server is running on port ' + app.get( 'port' ));
	});