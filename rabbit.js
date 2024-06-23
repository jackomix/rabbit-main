var didWeRestart = true; 
// Used to know if we need to restart the loop. 
// The wording is weird but it's also used to let the next item know if we restarted, so then we can switcht the transition icon to a shuffle icon.

var initalized = false;
var running = false;
var readyToUnpause = true;

var chosenLink; // Is declared globally so pausing and playing can continue.

function buttonClicked() {
    console.log("did we restart???: " + didWeRestart);

    if (running) {
        running = false;
        document.getElementById("mainButton").innerHTML = "jump back in";
    } else if (!running && readyToUnpause) {
        running = true;
        document.getElementById("mainButton").innerHTML = "pause";
        loop(); 
    }
}

function randomizeArticle() {
    console.log("We randomizin'")

    var itemName;

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=random&continue=-%7C%7C&redirects=1&utf8=1&formatversion=2&rnnamespace=0", true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var response = JSON.parse(xhr.responseText);
            itemName = response.query.random[0].title;

            getContents(itemName);
        }
    };
    xhr.send();
}

function getContents(itemName) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts%7Cpageimages%7Clinks%7Crevisions&piprop=original&pllimit=max&plnamespace=0&rvprop=ids&rvlimit=1&redirects=1&utf8=1&formatversion=2&exsentences=2&exintro=1&explaintext=1&titles=" + encodeURIComponent(itemName), true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var response = JSON.parse(xhr.responseText);

            console.log(response);
            
            var itemContents = response.query.pages[0].extract;
            if (typeof itemContents === "undefined") {
                itemContents = "Article doesn't exist...";
            }
            
            var itemImage = response.query.pages[0].original;
            if (typeof itemImage === "undefined") {
                itemImage = "var(--bg)";
            } else {
                itemImage = response.query.pages[0].original.source;
            }

            if (response.query.pages[0].links) {
                var randomIndex = Math.floor(Math.random() * response.query.pages[0].links.length);
                chosenLink = response.query.pages[0].links[randomIndex].title;
            } else {
                chosenLink = undefined;
            }

            // processItem both creates the item box, but returns the itembox it made as well.
            itemBox = processItem(itemName, itemContents, itemImage); // chosenLink is declared globally, so we don't need to pass it through.
            
            itemRevisionID = response.query.pages[0].revisions[0].revid;
            if (itemRevisionID) {
                detectArticleTopic(itemRevisionID, itemBox);
            }
        }
    };
    xhr.send();
}

function processItem(itemName, itemContents, itemImageURL) {
    var itemTemplate = document.getElementById("template").children[0];
    var itemBox = itemTemplate.cloneNode(true);

    var itemActualBox = itemBox.children[0];
    itemActualBox.querySelector("#itemNameLabel").innerText = itemName;
    itemActualBox.querySelector("#itemDescription").innerText = itemContents;
    itemActualBox.style.borderColor = getRandomColor(itemName);
    itemActualBox.style.boxShadow = `0 0 8pt ${itemActualBox.style.borderColor}, inset 0 0 8pt var(--background-color)`;
    itemActualBox.style.background = "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(" + itemImageURL + ")";
    /*itemBox.style.backgroundColor = itemActualBox.style.borderColor;*/

    var container = document.getElementById("storyContainer");
    container.prepend(itemBox);

    if (didWeRestart == true) {
        itemBox.querySelector(".transition").innerHTML = '<span class="shuffle">🔀&#xFE0E;</span>';

        var topicContainer = document.getElementById("topicContainer");
        topicContainer.innerHTML = "";
        // The item's topic doesn't get wiped since the item's topic is added after this function.

        didWeRestart = false;
    }

    if (typeof chosenLink === "undefined") {
        didWeRestart = true;
        itemActualBox.querySelector("#itemDescription").innerHTML = `<span class="error">Article doesn't exist...</span>`;
    }

    loop();

    return itemBox;
}

function detectArticleTopic(itemRevisionID, itemBox) {
    var itemTopic;

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.wikimedia.org/service/lw/inference/v1/models/enwiki-articletopic:predict", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var response = JSON.parse(xhr.responseText);
            
            itemTopic = response.enwiki.scores[Object.keys(response.enwiki.scores)[0]].articletopic.score.prediction[0];

            // Strip itemTopic to a more readable format
            console.log(itemTopic);
            itemTopic = itemTopic.replace(/\*/g, ''); // Remove asterisks
            var itemTopic = itemTopic.substring(itemTopic.lastIndexOf('.') + 1).trim();

            console.log(itemTopic);
            processItemTopic(itemTopic, itemBox);
        }
    };
    var requestBody = JSON.stringify({"rev_id": itemRevisionID});
    xhr.send(requestBody);
}

function processItemTopic(itemTopic, itemBox) {
    var topicContainer = document.getElementById("topicContainer");
    var topics = topicContainer.querySelectorAll(".topic");

    var foundMatch = false;

    // Check if the topic already exists
    topics.forEach(function(topic) {
        var topicLabel = topic.querySelector("#topicLabel").innerText;
        
        if (topicLabel === itemTopic) {
            var topicTally = topic.querySelector("#topicTally");
            var tally = parseInt(topicTally.innerText);
            tally++;
            topicTally.innerText = tally;
            foundMatch = true;
        }
    });

    // If the topic doesn't exist, create a new one
    if (!foundMatch) {
        var templateTopic = document.getElementById("template").querySelector(".topic").cloneNode(true);
        console.log(templateTopic)
        /*templateTopic.style.display = "block";*/
        templateTopic.querySelector("#topicLabel").innerText = itemTopic;
        templateTopic.querySelector("#topicTally").innerText = "1";

        templateTopic.style.borderColor = getRandomColor(itemTopic);
        templateTopic.querySelector(".tallyWrapper").style.outlineColor = templateTopic.style.borderColor;

        topicContainer.appendChild(templateTopic);

        topics = topicContainer.querySelectorAll(".topic"); // Update topics list
    }

    topics.forEach(function(topic) {
        var tally = parseInt(topic.querySelector("#topicTally").innerText);
        var hue = (tally * 25) % 360 + 90; // Calculate hue based on tally
        topic.querySelector(".tallyWrapper").style.backgroundColor = `hsla(${hue}, 100%, 50%, 0.25)`;
    });

    itemBox.style.backgroundColor = getRandomColor(itemTopic, 0.1);
    itemBox.style.boxShadow = `0 0 12pt 12pt ${itemBox.style.backgroundColor}`;
}

async function loop() {
    console.log("looping");
    readyToUnpause = false;
    await wait(2500);
    readyToUnpause = true;

    if (!running) return;

    if (didWeRestart == false) {
        getContents(chosenLink);
    } else {
        randomizeArticle();
    }
}

function getRandomColor(seed, alpha = 1) {
    const rng = new alea(seed);
    return `rgba(${Math.floor(rng() * 256)}, ${Math.floor(rng() * 256)}, ${Math.floor(rng() * 256)}, ${alpha.toFixed(2)}`;
}

// https://stackoverflow.com/questions/19389200/javascript-sleep-delay-wait-function
function wait(time) {
    return new Promise(resolve => {
        setTimeout(resolve, time);
    });
}