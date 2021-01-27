var used_images = [];
var numA = 0; // number of minions on warband A
var numB = 0;
var M = new Map(); // maps card names to their json entry
var selectedTier = 1;
var canvasVariable;

for (var i = 0; i < minions.length; i++) {
    M.set(minions[i]["name"], minions[i]);
}

function find(text) {
    for (var i = 0; i < minions.length; i++) {
        if (minions[i]["normalText"].toLowerCase().includes(text.toLowerCase())) {
            console.log(minions[i]["name"]);
        }
    }
}

pirateNames = [];
for (var i = 0; i < minions.length; i++) {
    if (minions[i]["race"].toLowerCase() == "pirate" || minions[i]["race"].toLowerCase() == "all") pirateNames.push(minions[i].name);
}

elementalNames = [];
for (var i = 0; i < minions.length; i++) {
    if (minions[i]["race"].toLowerCase() == "elemental" && minions[i].name != "Gentle Djinni"
        || minions[i]["race"].toLowerCase() == "all") {
        elementalNames.push(minions[i].name);
    }
}

demonNames = [];
for (var i = 0; i < minions.length; i++) {
    if (minions[i]["race"].toLowerCase() == "demon" && minions[i].name != "Imp Mama"
        || minions[i]["race"].toLowerCase() == "all") {
        demonNames.push(minions[i].name);
    }
}

tauntNames = [];
tauntExceptions = ["Houndmaster", "Defender of Argus", "Strongshell Scavenger", "Security Rover", "Imp Mama", 
                    "Qiraji Harbinger", "Champion of Y'Shaarj", "Arm of the Empire", "Elistra the Immortal"];
for (var i = 0; i < minions.length; i++) {
    if (minions[i]["normalText"].toLowerCase().includes("taunt") && !tauntExceptions.includes(minions[i]["name"])) {
        tauntNames.push(minions[i].name);
    }
}

dsNames = [];
dsExceptions = ["Selfless Hero", "Drakonid Enforcer", "Nadina the Red"];
for (var i = 0; i < minions.length; i++) {
    if (minions[i]["normalText"].toLowerCase().includes("divine shield") && !dsExceptions.includes(minions[i]["name"])) {
        dsNames.push(minions[i].name);
    }
}

deathrattleNames = []; // no exclude coiler
deathrattleExceptions = ["Ghastcoiler", "Baron Rivendare", "Rabid Saurolisk", "Monstrous Macaw"]
for (var i = 0; i < minions.length; i++) {
    if (minions[i]["normalText"].toLowerCase().includes("deathrattle") && !deathrattleExceptions.includes(minions[i]["name"])) {
        deathrattleNames.push(minions[i].name);
    }
}

poisonNames = ["Deadly Spore", "Maexxna"];
rebornNames = ["Bronze Warden", "Micro Mummy", "Acolyte of C'Thun", "Elistra the Immortal"];

onSummonMinions = ["Murloc Tidecaller", "Pack Leader", "Deflect-o-Bot", "Mama Bear", "Bigfernal"];
onAttackMinions = ["Ripsnarl Captain", "Dread Admiral Eliza", "Tormented Ritualist", "Arm of the Empire", "Champion of Y'Shaarj"];
onDSLossMinions = ["Bolvar, Fireblood", "Drakonid Enforcer"];
onDeathMinions = ["Scavenging Hyena", "Soul Juggler", "Junkbot", "Qiraji Harbinger"];
onKillMinions = ["Waxrider Togwaggle"];
auraMinions = ["Murloc Warleader", "Old Murk-Eye", "Southsea Captain", "Siegebreaker", "Mal'Ganis", "Khadgar", "Baron Rivendare"]
specialMinions = onSummonMinions.concat(onAttackMinions, onDSLossMinions, onDeathMinions, onKillMinions, auraMinions);

windfuryNames = ["Crackling Cyclone", "Seabreaker Goliath", "Zapp Slywick"];

twoManaCards = [];
for (var i = 0; i < minions.length; i++) {
    if (minions[i]["manacost"] == 2) twoManaCards.push(minions[i].name);
}
legendaryCards = [];
for (var i = 0; i < minions.length; i++) {
    if (minions[i]["rarity"] == "LEGENDARY" && minions[i].name != "Sneed's Old Shredder") legendaryCards.push(minions[i].name);
}

function showTier(tier) {
    selectedTier = tier;
    showGallery();
}

// returns the 1-based indices of the 0 <= n <= 7 cards in a warband
function indices(n) {
    var res = [];
    for (var i = 8 - n; i <= 6 + n; i += 2) {
        res.push(i);
    }
    return res;
}

function nameToSrc(name) {
    //console.log('cards/' + name + '.png');
    return 'cards/' + name + '.png';
}

function srcToName(src) {
    return src.substring(6, src.length - 4);
}

// returns the substring after the first space in the string
function afterSpace(s) {
    var ind = s.split(" ", 1)[0].length + 1;
    return s.slice(ind);
}

// Add the card 'card' to the specified band
// return whether insertion successful (no only if already 7 units there)
// Insertion happens at the newInd-th slot, Boolean moreLeft says if the mosue was 
// more towards the left of the center of the slot while dropping the minion

// if the fourth argument is a string create a fresh copy of that minion, else the third argument is a Card() object already
function addMinion(band, newInd, moreLeft, card) {
    var num = (band == 'a') ? numA : numB;
    if (num >= 7) return false;
    var bottomInd = indices(num)[0];
    var topInd = indices(num)[num - 1];
    /*
        img = document.createElement('img');
        img.src = nameToSrc(name);
        registerImage(img);
    
    */

    var newCard;
    var name;
    if ((typeof card) == "string") {
        var isGolden = false;
        if (card.charAt(card.length - 1) == 2) {
            isGolden = true;
            card = card.substring(0, card.length - 1);
        }
        var minion = M.get(card);
        name = card;
        var factor = (isGolden) ? 2 : 1;
        newCard = new Card(
            name,
            band,
            0, // assign later
            isGolden,
            minion["attack"] * factor,
            minion["health"] * factor,
            tauntNames.includes(name),
            dsNames.includes(name),
            rebornNames.includes(name),
            poisonNames.includes(name),
            windfuryNames.includes(name),
            0,
            0
        );
    } else {
        newCard = card;
        name = card.name;
    }

    var trueInd = newInd;
    var canvas = null;
    if (num == 0) {
        trueInd = 7;
        //document.getElementById(band + 7).appendChild(img);
        canvas = createCanvas(band, 7, newCard);
    } else if (newInd < bottomInd || (newInd == bottomInd && moreLeft)) {
        trueInd = bottomInd - 1;
        canvas = createCanvas(band, trueInd, newCard);
        //document.getElementById(band + (indices(num)[0] - 1)).appendChild(img);
        for (var i = bottomInd; i <= topInd; i += 2) {
            var currElem = document.getElementById(band + i);
            var nextElem = document.getElementById(band + (i + 1));
            var child = currElem.children[0];
            currElem.removeChild(child);
            nextElem.appendChild(child);
            //child.id = band + (i + 1) + ' ' + afterSpace(child.id);
            child.children[0].id = band + (i + 1) + ' ' + afterSpace(child.children[0].id);
        }
    } else if (newInd > topInd || (newInd == topInd && !moreLeft)) {
        trueInd = topInd + 1;
        canvas = createCanvas(band, trueInd, newCard);
        //document.getElementById(band + trueInd).appendChild(img);
        for (var i = bottomInd; i <= topInd; i += 2) {
            var currElem = document.getElementById(band + i);
            var prevElem = document.getElementById(band + (i - 1));
            var child = currElem.children[0];
            currElem.removeChild(child);
            prevElem.appendChild(child);
            //child.id = band + (i - 1) + ' ' + afterSpace(child.id);
            child.children[0].id = band + (i - 1) + ' ' + afterSpace(child.children[0].id);
        }
    } else {
        // If newInd is in between current occupied slots then trueInd = newInd
        // otherwise decrement newInd if moreLeft and increment otherwise
        if (newInd % 2 != num % 2) {
            trueInd = newInd;
        } else if (moreLeft) {
            trueInd = newInd - 1;
        } else {
            trueInd = newInd + 1;
        }

        //document.getElementById(band + trueInd).appendChild(img);
        canvas = createCanvas(band, trueInd, newCard);
        for (var i = trueInd + 1; i <= topInd; i += 2) {
            var currElem = document.getElementById(band + i);
            var nextElem = document.getElementById(band + (i + 1));
            var child = currElem.children[0];
            currElem.removeChild(child);
            nextElem.appendChild(child);
            child.children[0].id = band + (i + 1) + ' ' + afterSpace(child.children[0].id);
        }
        for (var i = trueInd - 1; i >= bottomInd; i -= 2) {
            var currElem = document.getElementById(band + i);
            var prevElem = document.getElementById(band + (i - 1));
            var child = currElem.children[0];
            currElem.removeChild(child);
            prevElem.appendChild(child);
            child.children[0].id = band + (i - 1) + ' ' + afterSpace(child.children[0].id);
        }

    }

    /*img.id = band + trueInd + ' ' + name;*/
    newCard.index = trueInd;
    var suffix = newCard.isGolden ? 2 : "";
    if (canvas != null) canvas.id = band + trueInd + ' ' + newCard.name + suffix;
    if (band == 'a') {
        numA++;
    } else {
        numB++;
    }
    return true;

}

// removes the minion at the slot ind of band 'band' and readjusts the corresponding warband
function removeMinion(band, ind) {
    //console.log("in remove minion");
    var elem = document.getElementById(band + ind);
    var num = (band == 'a') ? numA : numB;
    var bottomInd = indices(num)[0];
    var topInd = indices(num)[num - 1];
    var child = elem.children[0];
    elem.removeChild(child);
    for (var i = ind - 2; i >= bottomInd; i -= 2) {
        var currElem = document.getElementById(band + i);
        var nextElem = document.getElementById(band + (i + 1));
        var child = currElem.children[0];
        currElem.removeChild(child);
        nextElem.appendChild(child);
        child.id = band + (i + 1) + ' ' + afterSpace(child.id);
    }
    for (var i = ind + 2; i <= topInd; i += 2) {
        var currElem = document.getElementById(band + i);
        var prevElem = document.getElementById(band + (i - 1));
        var child = currElem.children[0];
        currElem.removeChild(child);
        prevElem.appendChild(child);
        child.id = band + (i - 1) + ' ' + afterSpace(child.id);
    }
    if (band == 'a') {
        numA--;
    } else {
        numB--;
    }
}

function registerImage(img) {
    img.width = 150;
    img.addEventListener("dragstart", dragStart);
    img.addEventListener("dragend", dragEnd);
    used_images.push(img);
    img.classList.add("visible");
    img.classList.add("card");
}

const images = document.getElementsByTagName("img");
for (var i = 0; i < images.length; i++) {
    registerImage(images[i]);
};

const spots = document.querySelectorAll(".spot");
spots.forEach(elem => {
    elem.addEventListener("dragenter", dragEnter);
    elem.addEventListener("dragover", dragOver);
    elem.addEventListener("dragleave", dragLeave);
    elem.addEventListener("drop", drop);
    // need to be careful not the have two event listeners for spots if the body also gets one
});
document.getElementById("gallery").addEventListener("drop", drop);
//document.getElementById("rest").addEventListener("drop", drop);

function allowDrop(ev) {
    ev.preventDefault();
}

function dragStart(event) {
    //console.log("drag start");
    //console.log(event.target);
    used_images.forEach(elem => {
        //if (elem != event.target) elem.classList.replace("visible", "invisible"); // only make OTHER images undroppable
        if (elem != event.target) { // only make OTHER images undroppable
            if (elem.id.startsWith("gallery")) {
                elem.classList.replace("visible", "invisible");
            } else {
                //elem.parentElement.children[0].classList.replace("visible", "invisible");
                //elem.parentElement.children[1].classList.replace("visible", "invisible");
                //elem.parentElement.children[0].classList.add("invisible");
                //elem.parentElement.children[1].classList.add("invisible");
            }
        }
    });
    spots.forEach(elem => {
        elem.classList.remove("invisible");
    });
    event.dataTransfer.setData("name", afterSpace(event.target.id));
    if (event.target.id.startsWith("gallery")) {
        event.dataTransfer.setData("parent", event.target.parentElement.id);
    } else {
        event.dataTransfer.setData("parent", event.target.parentElement.parentElement.id);
    }
    //console.log("dragStart: dropEffect = " + event.dataTransfer.dropEffect + " ; effectAllowed = " + event.dataTransfer.effectAllowed);
}

function dragEnd(event) {
    //console.log("drag end");
    used_images.forEach(elem => {
        //if (elem != event.target) elem.classList.replace("visible", "invisible"); // only make OTHER images undroppable
        if (elem != event.target) { // only make OTHER images undroppable
            if (elem.id.startsWith("gallery")) {
                elem.classList.replace("invisible", "visible");
            } else {
                canvasVariable = elem;
                //elem.parentElement.children[0].classList.replace("invisible", "visible"); 
                //elem.parentElement.children[1].classList.replace("invisible", "visible"); 
                //elem.parentElement.children[0].classList.remove("invisible");
                //elem.parentElement.children[1].classList.remove("invisible");
            }
        }
    });
    spots.forEach(elem => {
        elem.classList.add("invisible");
    });
}

function dragEnter(event) {
    //console.log("drag enter");
}

function dragOver(event) {
    //console.log("drag over");
    var isSpot = event.target.classList.contains("spot");
    //if (isSpot) event.preventDefault(); // THIS makes elements valid drop targets
    event.preventDefault();
}

function dragLeave(event) {
    //console.log("drag leave");
}

function drop(event) {


    //console.log("in drop");


    event.preventDefault();
    var dragContent = event.dataTransfer.getData("name");
    var dropId = event.target.id;
    var dropInd = parseInt(dropId.slice(1));
    var dragId = event.dataTransfer.getData("parent");
    var dragInd = parseInt(dragId.slice(1));
    //console.log("Drag Id = " + dragId);
    // console.log("Drop Id = " + dropId);
    //console.log("Drag content = " + dragContent);

    var dragged_card;
    if (dragId != "gallery") {
        dragged_card = getCard(dragId);
    }

    var moreLeft = null;
    if (dropId.charAt(0) == 'a' || dropId.charAt(0) == 'b') {
        var slotWidth = document.getElementById(dropId).offsetWidth;
        moreLeft = event.offsetX < (slotWidth / 2);
    }
    //console.log(moreLeft);

    if (dropId == "gallery") {
        if (dragId.charAt(0) == 'a') {
            removeMinion('a', dragInd);
        } else if (dragId.charAt(0) == 'b') {
            removeMinion('b', dragInd);
        }
    } else if (dropId.charAt(0) == 'a') {
        //console.log(dropId.slice(1));
        if (dragId.charAt(0) == 'b') { // other band
            if (addMinion('a', dropInd, moreLeft, dragged_card)) {
                removeMinion('b', dragInd);
            }
        } else if (dragId.charAt(0) == 'a') {
            var insertInd = dropInd;
            if (dropInd < dragInd) {
                insertInd++;
            } else if (dropInd > dragInd) {
                insertInd--;
            }
            removeMinion('a', dragInd);
            addMinion('a', insertInd, moreLeft, dragged_card);
        } else if (dragId == "gallery") {
            addMinion('a', dropInd, moreLeft, dragContent);
        }
    } else if (dropId.charAt(0) == 'b') {
        if (dragId.charAt(0) == 'a') {
            if (addMinion('b', dropInd, moreLeft, dragged_card)) {
                removeMinion('a', dragInd);
            }
        } else if (dragId.charAt(0) == 'b') {
            var insertInd = dropInd;
            if (dropInd < dragInd) {
                insertInd++;
            } else if (dropInd > dragInd) {
                insertInd--;
            }
            removeMinion('b', dragInd);
            //console.log("About to insert into b at insertInd=" + insertInd + " with dragContent=" + dragContent);
            addMinion('b', insertInd, moreLeft, dragged_card);
        } else if (dragId == "gallery") {
            addMinion('b', dropInd, moreLeft, dragContent);
        }
    }

    // drop operation over -> make minions draggable again
    used_images.forEach(elem => {
        elem.classList.replace("invisible", "visible");
    });
    spots.forEach(elem => {
        elem.classList.add("invisible");
    });
}


/*
function disallowPointerEvents() {
    spots.forEach(elem => {
        elem.classList.add("invisible");
    });

}
function allowPointerEvents() {
    spots.forEach(elem => {
        elem.classList.remove("invisible");
    });
}
*/


// card constructor
function Card(name, band, index, isGolden, attack, health, hasTaunt, hasDS, hasReborn, hasPoison, hasWindfury, numPlants, numBots) {
    this.name = name;
    this.band = band;
    this.index = index;
    this.isGolden = isGolden;
    this.attack = attack;
    this.health = health;
    this.hasTaunt = hasTaunt;
    this.hasDS = hasDS;
    this.hasReborn = hasReborn;
    this.hasPoison = hasPoison;
    this.hasWindfury = hasWindfury;
    this.numPlants = numPlants;
    this.numBots = numBots;
}


// returns the created canvas
function createCanvas(band, index, card) {

    var name = card.name;

    var outerDiv = document.createElement("div");
    outerDiv.classList.add("outer");
    var canvas = document.createElement("canvas");
    //canvas.style = "border:1px solid #000000;";
    canvas.classList.add("visible");
    canvas.draggable = "true";
    //canvas.addEventListener("dragenter", dragEnter);
    //canvas.addEventListener("dragover", dragOver);
    //canvas.addEventListener("dragleave", dragLeave);
    // canvas.addEventListener("drop", drop);
    var context = canvas.getContext("2d");
    context.rect(0, 0, canvas.width, canvas.height);
    context.stroke();
    var img = document.createElement('img');
    //console.log("THE NAME IS " + name);
    //console.log("THE GOLDEN STATE IS " + card.isGolden);
    var suffix = (card.isGolden) ? 2 : "";
    // Used Faststone image resizer to set width to 140 without adding as much blur as HTML
    img.src = 'cards/resized/' + name + suffix + '.png';
    img.onload = function () {
        //context.drawImage(img, 10, 0, 130, 130 * img.height / img.width);
        //context.drawImage(img, 0, 0, img.width, img.height);
        context.drawImage(img, 5, 0, 130, 193, 0, 0, 130, 193);
    };
    registerImage(canvas);
    canvas.width = 135;
    canvas.height = 193;

    var dataDiv = document.createElement("div");
    dataDiv.classList.add("data");
    dataDiv.classList.add("visible");
    //dataDiv.classList.add("unselectable");
    var data1 = document.createElement("div");
    data1.classList.add("data1");
    var data2 = document.createElement("div");
    var data3 = document.createElement("div");
    var data4 = document.createElement("div");


    var attackInput = document.createElement("input");
    attackInput.classList.add("cardInput");
    attackInput.addEventListener('change', validateInput);
    attackInput.value = card.attack;
    var attackText = document.createTextNode(" Attack ");
    data1.appendChild(attackInput);
    data1.appendChild(attackText);
    var healthInput = document.createElement("input");
    healthInput.classList.add("cardInput");
    healthInput.addEventListener('change', validateInput);
    healthInput.value = card.health;
    var healthText = document.createTextNode(" Health");
    data1.appendChild(healthInput);
    data1.appendChild(healthText);
    dataDiv.appendChild(data1);


    var tauntInput = document.createElement("input");
    tauntInput.type = "checkbox";
    tauntInput.checked = card.hasTaunt;
    var dsInput = document.createElement("input");
    dsInput.type = "checkbox";
    dsInput.checked = card.hasDS;
    var rebornInput = document.createElement("input");
    rebornInput.type = "checkbox";
    rebornInput.checked = card.hasReborn;
    var tauntText = document.createTextNode("Taunt ");
    var dsText = document.createTextNode("DS ");
    var rebornText = document.createTextNode("Reborn");
    data2.appendChild(tauntInput);
    data2.appendChild(tauntText);
    data2.appendChild(dsInput);
    data2.appendChild(dsText);
    data2.appendChild(rebornInput);
    data2.appendChild(rebornText);
    dataDiv.appendChild(data2);



    var poisonInput = document.createElement("input");
    poisonInput.type = "checkbox";
    poisonInput.checked = card.hasPoison;
    var poisonText = document.createTextNode("Poison ");
    data3.appendChild(poisonInput);
    data3.appendChild(poisonText);
    var windfuryInput = document.createElement("input");
    windfuryInput.type = "checkbox";
    windfuryInput.checked = card.hasWindfury;
    var windfuryText = document.createTextNode("Windfury");
    data3.appendChild(windfuryInput);
    data3.appendChild(windfuryText);
    dataDiv.appendChild(data3);



    var plantInput = document.createElement("input");
    plantInput.classList.add("cardInput2");
    plantInput.addEventListener('change', validateInput);
    var plantText = document.createTextNode(" Plants ");
    var botInput = document.createElement("input");
    botInput.classList.add("cardInput2");
    botInput.addEventListener('change', validateInput);
    var botText = document.createTextNode(" Bots");
    plantInput.setAttribute("value", card.numPlants);
    botInput.setAttribute("value", card.numBots);
    data4.appendChild(plantInput);
    data4.appendChild(plantText);
    data4.appendChild(botInput);
    data4.appendChild(botText);
    dataDiv.appendChild(data4);
    outerDiv.appendChild(canvas);
    outerDiv.appendChild(dataDiv);

    var spot = document.getElementById(band + index);
    spot.appendChild(outerDiv);

    return canvas;

}


// returns a card object with the fields currently on the argument spot
function getCard(spot) {

    var canvas = document.getElementById(spot).children[0].children[0];
    var name = afterSpace(canvas.id);
    var isGolden = name.charAt(name.length - 1) == '2';
    if (name.charAt(name.length - 1) == '2') name = name.substring(0, name.length - 1);
    //console.log("In get card. Is golden? " + isGolden);
    var band = spot[0];
    var index = spot.substring(1, spot.length);
    var dataDiv = document.getElementById(spot).children[0].children[1];
    var card = new Card(
        name,
        band,
        index,
        isGolden,
        dataDiv.children[0].children[0].value,
        dataDiv.children[0].children[1].value,
        dataDiv.children[1].children[0].checked,
        dataDiv.children[1].children[1].checked,
        dataDiv.children[1].children[2].checked,
        dataDiv.children[2].children[0].checked,
        dataDiv.children[2].children[1].checked,
        dataDiv.children[3].children[0].value,
        dataDiv.children[3].children[1].value
    );
    //console.log(card);
    return card;

}

// Loads all images once so changing tavern doesn't make the page jump
function loadAllImages() {

    var elem = document.getElementById("goldenButton");
    for (var i = 1; i <= 6; i++) {
        selectedTier = i;
        showGallery();
    }
    elem.checked = true;
    for (var i = 1; i <= 6; i++) {
        selectedTier = i;
        showGallery();
    }
    elem.checked = false;
    selectedTier = 1;
    showGallery();

}

// Display the cards (in golden if box checked)
function showGallery() {

    var golden = document.getElementById("goldenButton").checked;
    var suffix = (golden) ? 2 : "";
    // Clear gallery
    var gallery = document.getElementById("gallery");
    while (gallery.children.length > 0) {
        gallery.removeChild(gallery.children[0]);
    }
    gallery.innerHTML = "";

    var elem = document.getElementById("gallery_box");
    elem.style.width = "100px";

    /*
        // Add all images of minions of this tier
        for (var i = 0; i < minions.length; i++) {
            var minion = minions[i];
            if (minion["techLevel"] == selectedTier) {
                img = document.createElement('img');
                //img.src = 'https://cards.hearthpwn.com/enUS/bgs/' + minion.normalId + '_bg.png';
                img.src = 'cards/' + minion["name"] + suffix + '.png';
                img.style = "width:100px";
                img.classList.add("card");
                //img.addEventListener("dragstart", dragStart);
                registerImage(img);
                img.id = "gallery " + minion["name"] + suffix;
                gallery.appendChild(img);
            }
        }
    */
    var tags = ["Beast", "Demon", "Dragon", "Elemental", "Mech", "Murloc", "Pirate", "Rest"];
    var tribeMinions = findMinions(selectedTier);
    for (var tribe = 0; tribe < 8; tribe++) {
        if (tribeMinions[tribe].length == 0) continue;
        var node = document.createTextNode(tags[tribe]);
        gallery.appendChild(node);
        //gallery.innerHTML += tags[tribe];
        for (var i = 0; i < tribeMinions[tribe].length; i++) {
            var minion = tribeMinions[tribe][i];
            if (minion["techLevel"] == selectedTier) {
                var img = document.createElement('img');
                //img.src = 'https://cards.hearthpwn.com/enUS/bgs/' + minion.normalId + '_bg.png';
                img.src = 'cards/resized/' + minion["name"] + suffix + '.png';
                img.style = "width:100px";
                img.classList.add("card");
                //img.addEventListener("dragstart", dragStart);
                registerImage(img);
                img.id = "gallery " + minion["name"] + suffix;
                gallery.appendChild(img);
            }
        }
    }

}


// returns all the minions of this tribe on this tier in alphabetical order
function findTribeMinions(tribe_orig, tribe, tier) { // tribe_orig is only different because mechs are tagged "MECHANICAL"
    var res = [];
    for (var i = 0; i < minions.length; i++) {
        var minion = minions[i];
        var race = minion.race.toLowerCase();
        if (minion.techLevel != tier) continue;
        if (race == tribe_orig.toLowerCase()
            || minion.normalText.toLowerCase().includes(tribe.toLowerCase())) res.push(minion);
        //console.log(res);
    }
    return res;
}

// return an array of arrays containing the minions by tribe, and the 8-th entry is those without tribe
function findMinions(tier) {
    var result = [];
    var tribes_orig = ["BEAST", "DEMON", "DRAGON", "ELEMENTAL", "MECHANICAL", "MURLOC", "PIRATE"];
    var tribes = ["Beast", "Demon", "Dragon", "Elemental", "Mech", "Murloc", "Pirate"];
    var nonNeutrals = [];
    for (var i = 0; i < 7; i++) {
        var tribeUnits = findTribeMinions(tribes_orig[i], tribes[i], tier);
        result.push(tribeUnits);
        nonNeutrals = nonNeutrals.concat(tribeUnits);
    }
    var thisTierMinions = [];
    for (var i = 0; i < minions.length; i++) {
        if (minions[i].techLevel == tier) thisTierMinions.push(minions[i]);
    }
    var rest = thisTierMinions.filter(x => !nonNeutrals.includes(x)); // set difference
    result.push(rest);
    //console.log(result);
    return result;
}



// validates card stats: rounds and clips to [1, 1000] 
function validateInput(event) {
    var maxValue = 1000;
    var defaultValue = 1;
    var finalValue;
    if (isNaN(event.target.value)) {
        finalValue = defaultValue;
    } else {
        finalValue = Math.max(event.target.value, 0);
        finalValue = Math.min(finalValue, maxValue);
        finalValue = Math.floor(finalValue);
    }
    event.target.value = finalValue;
}

// clears the corresponding warband
function clearBand(band) {
    for (var i = 1; i <= 13; i++) {
        var spot = document.getElementById(band + i);
        if (spot.children.length > 0) spot.removeChild(spot.children[0]);
    }
    if (band == 'a') {
        numA = 0;
    } else {
        numB = 0;
    }
}

// reads the input string. If valid sets up the board of the input warband.
function importComp(band) {

    var s = document.getElementById("import_" + band).value;
    //if (isNaN(s[0]) || s[1] != '|') return;
    var cards = [];
    var num = s[0];
    var splits = s.substring(2).split('|');
    //if (splits.length != num) return;
    for (var i = 0; i < num; i++) {
        var values = splits[i].split(' ');
        //if (values.length < 6) return;
        var cardName = values.slice(5).join(' ');
        var bools = values[2]; // need to convert to booleans first: double negate with !!
        var card = new Card(cardName, band, -1, !!parseFloat(bools[0]), parseFloat(values[0]),
            parseFloat(values[1]), !!parseFloat(bools[1]), !!parseFloat(bools[2]), !!parseFloat(bools[3]),
            !!parseFloat(bools[4]), !!parseFloat(bools[5]), parseFloat(values[3]), parseFloat(values[4]));
        //console.log(values);
        //console.log(card);
        cards.push(card);
    }
    clearBand(band);
    for (var i = 0; i < num; i++) {
        addMinion(band, 13, false, cards[i]); // iteratively insert last
    }

}

// converts the current comp on the input warband to a string and copies it to clipboard
function exportComp(band) {
    var num = (band == 'a') ? numA : numB;
    var res = num;
    for (var i = 8 - num; i <= 6 + num; i += 2) {
        var card = getCard(band + i);
        res += '|' + card.attack + " " + card.health + " ";
        res += card.isGolden ? 1 : 0;
        res += card.hasTaunt ? 1 : 0;
        res += card.hasDS ? 1 : 0;
        res += card.hasReborn ? 1 : 0;
        res += card.hasPoison ? 1 : 0;
        res += card.hasWindfury ? 1 : 0;
        res += " " + card.numPlants + " " + card.numBots + " " + card.name;
    }

    // Copy to clipboard
    var tempInput = document.createElement("input");
    tempInput.value = res;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);

    return res;
}

// Handle hero power selection. Input is 'a' or 'b'
function selectHP(band) {

    var otherBand = (band == 'a') ? 'b' : 'a';
    var selectElem = document.getElementById("hp_" + band);
    var heroName = selectElem.value;
    var imageElem = document.getElementById("hp_image_" + band);
    var otherImageElem = document.getElementById("hp_image_" + otherBand);
    if (imageElem.children.length > 0) imageElem.removeChild(imageElem.children[0]);
    if (heroName != "None") {
        var img = document.createElement('img');
        img.src = "hero_powers/" + heroName + ".png";
        img.style = "width:170px";
        imageElem.appendChild(img);
        if (otherImageElem.children.length == 0) {
            var filler = document.createElement("div");
            filler.style = "width:170px";
            otherImageElem.appendChild(filler);
        }
    } else {
        if (otherImageElem.children.length > 0) {
            var filler = document.createElement("div");
            filler.style = "width:170px";
            imageElem.appendChild(filler);
        }
    }

    if (heroName == "None" && document.getElementById("hp_" + otherBand).value == "None") {
        imageElem.removeChild(imageElem.children[0]);
        otherImageElem.removeChild(otherImageElem.children[0]);
    }

}

// handles hero power HP changes of the input band
function changeHeroHP(band) {

    var elem = document.getElementById('hero_hp_' + band);
    var value = elem.value;
    var defaultValue = 40;
    var finalValue;
    if (isNaN(value)) {
        finalValue = defaultValue;
    } else {
        finalValue = Math.max(value, 1);
        finalValue = Math.min(finalValue, 50);
        finalValue = Math.floor(finalValue);
    }
    elem.value = finalValue;

}

// handles a change to the tavern level of this band
function changeTavern(band) {

    var elem = document.getElementById('hero_tavern_' + band);
    var value = elem.value;
    var defaultValue = 6;
    var finalValue;
    if (isNaN(value)) {
        finalValue = defaultValue;
    } else {
        finalValue = Math.max(value, 1);
        finalValue = Math.min(finalValue, 6);
        finalValue = Math.floor(finalValue);
    }
    elem.value = finalValue;

}

/*
// return the odds to go 12 wins in arena determined using numSimul simulations
function arenaSim(numSimul) {
    var prob = 0;
    for (var i = 0; i < numSimul; i++) {
        var numWins = 0;
        var numLosses = 0;
        while (numWins < 12 && numLosses < 3) {
            if (randomInt(2) == 0) {
                numWins++;
            } else {
                numLosses++;
            }
            if (numWins == 12) prob++;
        }
    }
    prob /= numSimul;
    console.log(100*prob);
    return 100*prob;
}
*/
