var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var mongodb = require("mongodb");
var ObjectID = mongodb.ObjectID;
var cors = require('cors');

var CONTACTS_COLLECTION = "contacts";
var SCOUTS_COLLECTION = "scouts";
var CUSTOMERS_COLLECTION = "customers";
var SALESHEETS_COLLECTION = "salesheets";
var DATA_COLLECTION = "data";

var app = express();


app.use(cors());
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.json());

// Create a database variable outside of the database connection callback to reuse the connection pool in your app.
var db;

// Connect to the database before starting the application server.
mongodb.MongoClient.connect(process.env.MONGODB_URI, function (err, database) {
    if (err) {
        console.log(err);
        process.exit(1);
    }

    // Save database object from the callback for reuse.
    db = database;
    console.log("Database connection ready");

    // Initialize the app.
    var server = app.listen(process.env.PORT || 8080, function () {
        var port = server.address().port;
        console.log("App now running on port", port);
    });
});

// CONTACTS API ROUTES BELOW

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
    console.log("ERROR: " + reason);
    res.status(code || 500).json({"error": message});
}

/*  "/contacts"
 *    GET: finds all contacts
 *    POST: creates a new contact
 */

app.get("/scouts", function (req, res) {
    db.collection(SCOUTS_COLLECTION).find({}).toArray(function (err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get scouts.");
        } else {
            res.status(200).json(docs);
        }
    })
});

app.get("/scouts/additem", function (req, res) {
    db.collection(SCOUTS_COLLECTION).updateMany({}, {$set: {customerIDs: []}}, {upsert: true}, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to add/update scout");
        } else {
            res.status(204).json(doc);
        }
    });
});

app.post("/scouts", function(req, res) {
    var newScout = req.body;

    if (!req.body['name']) {
        handleError(res, "Invalid scout input", "Must provide a name", 400);
    }
    db.collection(SCOUTS_COLLECTION).updateMany({name: newScout.name}, {$set: {years: newScout.years}}, {upsert: true}, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to add/update scout");
        } else {
            res.status(204).json(doc);
        }
    });
});

app.delete("/scouts/preclear", function (req, res) {

    db.collection(SCOUTS_COLLECTION).removeMany({name: req.params.name}, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to remove scout[s] before updating.");
        } else {
            res.status(200)
        }
    });
});

app.post("/leads", function (req, res) {
    const id = req.body.id;
    const lead = req.body.lead;

    db.collection(SCOUTS_COLLECTION).updateOne({id: id}, {$push: {'customerIDs': lead}}, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to update contact");
        } else {
            res.status(204).end();
        }
    });
});

app.delete("/leads", function (req, res) {
    const id = req.body.id;
    const leads = req.body.leads;

    db.collection(SCOUTS_COLLECTION).updateOne({id: id}, {$set: {'customerIDs': leads}}, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to update contact");
        } else {
            res.status(204).end();
        }
    });
});

app.get("/sheets", function (req, res) {
    db.collection(SALESHEETS_COLLECTION).find({}).toArray(function (err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get salesheets.");
        } else {
            res.status(200).json(docs);
        }
    })
});

app.post("/sheets", function(req, res) {
    var newSheet = req.body;
    db.collection(SALESHEETS_COLLECTION).insertOne(newSheet, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to create new salesheet.");
        } else {
            res.status(201).json(doc.ops[0]);
        }
    })
});

app.get("/customers", function (req, res) {
    db.collection(CUSTOMERS_COLLECTION).find({}).toArray(function (err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get customers.");
        } else {
            res.status(200).json(docs);
        }
    })
});

app.get("/customers/subset", function (req, res) {
    var customersToGet = req.body.ids;
    customersToGet = customersToGet.map(function (cust) {return new ObjectID(cust)});

    db.collection(CUSTOMERS_COLLECTION).find({id: {$in: customersToGet}}).toArray(function (err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get customers.");
        } else {
            res.status(200).json(docs);
        }
    })
});

app.get("/clearall", function(req, res) {
    var total = 0;
    db.collection(SCOUTS_COLLECTION).removeMany({}, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to clear all");
        } else {
            total += doc['n'];
            db.collection(CUSTOMERS_COLLECTION).removeMany({}, function(err, doc) {
                if (err) {
                    handleError(res, err.message, "Failed to clear all");
                } else {
                    total += doc['n'];
                    db.collection(SALESHEETS_COLLECTION).removeMany({}, function(err, doc) {
                        if (err) {
                            handleError(res, err.message, "Failed to clear all");
                        } else {
                            res.status(200).json(Object.assign({}, doc, {'n': total}));
                        }
                    });
                }
            });
        }
    });

});

app.get("/preclearall", function(req, res) {
    var name = req.param.name;

    db.collection(SCOUTS_COLLECTION).removeMany({name: name}, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to clear all");
        } else {
            console.log('deleting name', name);
            res.status(200).json(doc);
        }
    });
});

app.post("/customers", function(req, res) {
    var newCustomer = req.body;

    if (!req.body['Customer Name']) {
        handleError(res, "Invalid user input", "Must provide a name", 400);
    }

    db.collection(CUSTOMERS_COLLECTION).insertOne(newCustomer, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to create new customer.");
        } else {
            res.status(201).json(doc.ops[0]);
        }
    })
});

app.get("/data", function (req, res) {
    db.collection(DATA_COLLECTION).find({}).toArray(function (err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get data.");
        } else {
            res.status(200).json(docs);
        }
    })
});

app.post("/data", function(req, res) {
    var field = req.body.field;
    var value = req.body.value;

        if (!req.body.field) {
        handleError(res, "Invalid user input", "Must provide a field to change", 400);
    }

    db.collection(DATA_COLLECTION).updateOne({field: field}, {$set: {value: value}}, {upsert: true}, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to update field in data.");
        } else {
            res.status(201).json(doc.ops[0]);
        }
    })
});
    

////////////////////////////////////////////////////////////////////////////////////////////
app.post("/contacts", function(req, res) {
    var newContact = req.body;
    newContact.createDate = new Date();

    if (!(req.body.firstName || req.body.lastName)) {
        handleError(res, "Invalid user input", "Must provide a first or last name.", 400);
    }

    db.collection(CONTACTS_COLLECTION).insertOne(newContact, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to create new contact.");
        } else {
            res.status(201).json(doc.ops[0]);
        }
    });
});

app.get("/contacts", function(req, res) {
    db.collection(CONTACTS_COLLECTION).find({}).toArray(function(err, docs) {
        if (err) {
            handleError(res, err.message, "Failed to get contacts.");
        } else {
            res.status(200).json(docs);
        }
    });
});

/*  "/contacts/:id"
 *    GET: find contact by id
 *    PUT: update contact by id
 *    DELETE: deletes contact by id
 */

app.get("/contacts/:id", function(req, res) {
    db.collection(CONTACTS_COLLECTION).findOne({ _id: new ObjectID(req.params.id) }, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to get contact");
        } else {
            res.status(200).json(doc);
        }
    });
});

app.put("/contacts/:id", function(req, res) {
    var updateDoc = req.body;
    delete updateDoc._id;

    db.collection(CONTACTS_COLLECTION).updateOne({_id: new ObjectID(req.params.id)}, updateDoc, function(err, doc) {
        if (err) {
            handleError(res, err.message, "Failed to update contact");
        } else {
            res.status(204).end();
        }
    });
});

app.delete("/contacts/:id", function(req, res) {
    db.collection(CONTACTS_COLLECTION).deleteOne({_id: new ObjectID(req.params.id)}, function(err, result) {
        if (err) {
            handleError(res, err.message, "Failed to delete contact");
        } else {
            res.status(204).end();
        }
    });
});

/////////Utility Functions/////////////////////////

app.get("/scouts/addcolumn", function(req, res) {

    db.collection(SCOUTS_COLLECTION).updateMany({}, {$set: {'customerIDs': []}}, function(err, result) {
        if (err) {
            handleError(res, err.message, "Failed to delete contact");
        } else {
            res.status(204).end();
        }
    });
});