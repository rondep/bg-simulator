var A, B, firstFight, turn, attacker, defender;
var winLog, tieLog, lossLog, bestLog, worstLog, currentLog;
var diedA, diedB, dmgA, dmgB, bestSignedDmg, worstSignedDmg;

function Warband(health, tavern, heroPower) {
    this.health = parseFloat(health);
    this.tavern = parseFloat(tavern);
    this.heroPower = heroPower;
    this.head = null;
    this.nextAttacker = null;
    this.specialMinions = new Set(); // effect depends on other minions on the board
    this.deadMechs = []; // store first two mechs that die for Kangor's
    this.length = function () {
        var count = 0;
        var currNode = this.head;
        while (currNode != null) {
            if (currNode.status == "alive") count++;
            currNode = currNode.next;
        }
        return count;
    };
    this.tail = function () { // returns null if empty
        var currNode = this.head;
        var lastNode = null;
        while (currNode != null) {
            if (currNode.next == null) lastNode = currNode;
            currNode = currNode.next;
        }
        return lastNode;
    };
    this.insertLast = function (newMinion) {
        //console.log("Trying to insert " + newMinion.name);
        if (this.tail() == null) {
            this.head = newMinion;
        } else {
            var oldTail = this.tail();
            oldTail.next = newMinion;
            newMinion.prev = oldTail;
        }
        this.registerMinion(newMinion);
    };
    this.insertAfter = function (newMinion, afterMinion) {
        var tempRoot = afterMinion;
        afterMinion = afterMinion.lastChild; // jump to afterMinion's last child -> insertion happens here
        tempRoot.lastChild = newMinion;
        newMinion.next = afterMinion.next;
        newMinion.prev = afterMinion;
        if (afterMinion.next != null) afterMinion.next.prev = newMinion;
        afterMinion.next = newMinion;
        whenSthSummoned(newMinion);
        this.registerMinion(newMinion);
        // if this is an aura buffer, apply its buffs
        if (auraMinions.includes(newMinion.name)) auraBuffAll(newMinion);
    }
    this.registerMinion = function (minion) {
        if (specialMinions.includes(minion.name)) {
            this.specialMinions.add(minion);
        }
    };
    this.remove = function (minion) {
        if (minion == this.head) {
            if (minion.next == null) {
                this.head = null;
                // list is now empty
            } else {
                this.head = minion.next;
                minion.next.prev = null;
            }
        } else if (minion.next == null) { // tail and not only element
            minion.prev.next = null;
        } else { // somewhere in the middle
            minion.prev.next = minion.next;
            minion.next.prev = minion.prev;
        }
    };
    this.toString = function () {
        var res = "";
        var currNode = this.head;
        while (currNode != null) {
            if (currNode.status == "alive") {
                var hasDS = (currNode.hasDS) ? 1 : 0;
                res += currNode.name + " (" + currNode.attack + "/" + currNode.health + ")"
                    + (hasDS ? " DS" : "") + " | ";
            }
            currNode = currNode.next;
        }
        if (res.substring(res.length - 2) == "| ") res = res.substring(0, res.length - 2); // easier to just check if next node is last...
        return res;
    };
    this.printComplete = function () {
        var res = "";
        var currNode = this.head;
        while (currNode != null) {
            var hasDS = (currNode.hasDS) ? 1 : 0;
            res += currNode.name + " (" + currNode.attack + "/" + currNode.health + ") " + hasDS + " [" + currNode.status + "]  | ";
            currNode = currNode.next;
        }
        if (res.substring(res.length - 2) == "| ") res = res.substring(0, res.length - 2);
        console.log(res);
    }
    // returns a copy of this warband
    this.copy = function () {
        var copy = new Warband(this.health, this.tavern, this.heroPower);
        var currNode = this.head;
        while (currNode != null) {
            copy.insertLast(currNode.copy());
            currNode = currNode.next;
        }
        return copy;
    };
    // returns an array of the nodes currently in the list (needed for unstable ghoul, as its DR
    // changes the LL while iterating over it)
    this.currentNodes = function () {
        var result = [];
        var currNode = this.head;
        while (currNode != null) {
            result.push(currNode);
            currNode = currNode.next;
        }
        return result;
    };
    this.findTarget = function () {
        var currNode = this.head;
        var tauntTargets = [];
        var targets = [];
        while (currNode != null) {
            if (currNode.status == 'alive' && currNode.health > 0) {
                if (currNode.hasTaunt) {
                    tauntTargets.push(currNode);
                } else {
                    targets.push(currNode); // only non-taunt targets. will be ignored if there is any taunt
                }
            }
            currNode = currNode.next;
        }
        if (tauntTargets.length > 0) {
            return (randomEntry(tauntTargets));
        } else {
            return (randomEntry(targets));
        }
    };
    this.findZappTarget = function () {
        var currNode = this.head;
        var minAttackTargets = [];
        var minAttack = Number.MAX_SAFE_INTEGER;
        while (currNode != null) {
            if (currNode.status == "alive") {
                if (currNode.attack < minAttack) {
                    minAttack = currNode.attack;
                    minAttackTargets = [currNode];
                } else if (currNode.attack == minAttack) {
                    minAttackTargets.push(currNode);
                }
            }
            currNode = currNode.next;
        }
        return randomEntry(minAttackTargets);
    };
    this.collectDead = function () {
        var foundDeath = false;
        var currNode = this.head;
        while (currNode != null) {
            if (currNode.status == 'alive' && currNode.health <= 0) {
                currNode.status = 'dead';
                whenSthDies(currNode);
                foundDeath = true;
            } else if (currNode.status == 'dead') {
                foundDeath = true;
            }
            currNode = currNode.next;
        }
        return foundDeath;
    };
    this.triggerDeathrattles = function () {
        var currNode = this.head;
        while (currNode != null) {
            if (currNode.status == 'dead') {
                if (true || deathrattleNames.includes(currNode.name)) { // ALWAYS execute this (non-DRs can also have plants/bots)
                    this.triggerOneDeathrattle(currNode);
                }
                if (auraMinions.includes(currNode.name)) auraDebuffAll(currNode);
                currNode.status = 'done';

                if (currNode.hasReborn) {
                    var rebornMinion = plainMinion(currNode.name, currNode.side, currNode.isGolden);
                    rebornMinion.health = 1;
                    rebornMinion.hasReborn = false;
                    summon([rebornMinion], currNode);
                }
            }
            currNode.lastChild = currNode; // probably not needed because dead
            currNode = currNode.next;
        }
    };
    // trigger this deathrattle (handles baron)
    this.triggerOneDeathrattle = function (DRMinion) {
        deathrattle(DRMinion);
        // Trigger DR once more if there is a Baron on board
        var baronOnBoard = false;
        var goldenBaronOnBoard = false;
        for (var minion of this.specialMinions) {
            if (minion.status == "alive" && minion.name == "Baron Rivendare") {
                if (minion.isGolden) {
                    goldenBaronOnBoard = true;
                    break;
                } else {
                    baronOnBoard = true;
                }
            }
        }
        if (goldenBaronOnBoard) {
            deathrattle(DRMinion);
            deathrattle(DRMinion);
        } else if (baronOnBoard) {
            deathrattle(DRMinion);
        }
    }
    // assuming a non-empty LL containing this.nextAttacker, returns the next attacker in sequence or else null
    // if this.nextAttacker is null, start from the beginning
    this.findNextAttacker = function () {
        var currNode;
        // If no initial attacker has been found yet (all eggs)
        if (this.nextAttacker == null) {
            if (this.head.next == null) { // one egg
                return null;
            } else {
                currNode = this.head.next;
                this.nextAttacker = this.head; // start looping at the beginning
            }
        } else if (this.nextAttacker.next == null) {
            currNode = this.head; // start looping after current hitter
        } else {
            currNode = this.nextAttacker.next; // start looping at the beginning (hitter is last element)
        }
        var newAttacker = null;
        while (currNode != null) {
            //console.log("Head = " + this.head.name); // mechano egg
            //console.log("Currnode = " + currNode.name); // token
            //console.log("nextAttacker = " + this.nextAttacker.name); // deflecto
            //if (stopIt-- == 0) break; // REMOVE THIS LATER
            if (currNode.status == 'alive' && currNode.attack > 0) {
                newAttacker = currNode;
                break;
            }
            // may need to loop around and keep looking;
            if (currNode == this.nextAttacker) break; // looped around once -> stop (this test of course needs to be AFTER the currNode update, else the same minion attacking again is not possible........)
            currNode = (currNode.next == null) ? this.head : currNode.next;
        }
        return newAttacker;
    };
    // removes all 'done' minions from the LL. Shouldn't contain any alive <=0hp or dead minions when calling.
    this.cleanUp = function () {
        var currNode = this.head;
        while (currNode != null) {
            if (currNode.status == 'done' && currNode != this.nextAttacker) { // MUST NOT logically remove the current attacker
                this.remove(currNode);
                if (this.specialMinions.has(currNode)) this.specialMinions.delete(currNode);
                // Need to check here too otherwise we might unlink special minions without removing their effect
            }
            currNode = currNode.next;
        }
    };
    this.cleanSpecialMinions = function () {
        var currNode = this.head;
        while (currNode != null) {
            if (currNode.status == 'done' && this.specialMinions.has(currNode)) {
                this.specialMinions.delete(currNode);
            }
            currNode = currNode.next;
        }
    };
    this.randomAlive = function () {
        var currNode = this.head;
        var targets = [];
        while (currNode != null) {
            if (currNode.status == "alive" && currNode.health > 0) targets.push(currNode);
            currNode = currNode.next;
        }
        return randomEntry(targets);
    };
    // returns the set of alive neighbors (Cardinality between 0 and 2)
    this.neighbors = function (node) {
        var result = [];
        var currNode = node.prev;
        while (currNode != null) {
            if (currNode.status == 'alive') {
                result.push(currNode); // result += currNode doesnt throw an error?!?!
                break;
            }
            currNode = currNode.prev;
        }
        currNode = node.next;
        while (currNode != null) {
            if (currNode.status == 'alive') {
                result.push(currNode);
                break;
            }
            currNode = currNode.next;
        }
        return result;

    }
    // Find the first minion with >0 attack, or else null
    this.findInitialAttacker = function () {
        var currNode = this.head;
        result = null;
        while (currNode != null) {
            if (currNode.attack > 0) {
                result = currNode;
                break;
            }
            currNode = currNode.next;
        }
        return result;
    }
    // Computes the damage dealt by this damage (only alive minions + hero tavern)
    this.countDamage = function () {
        var dmg = this.tavern;
        var currNode = this.head;
        while (currNode != null) {
            if (currNode.status == "alive") dmg += currNode.tavern;
            currNode = currNode.next;
        }
        return dmg;
    }
    // Returns a list of alive elistras on this warband.
    this.findElistras = function () {
        var elistras = [];
        var currNode = this.head;
        while (currNode != null) {
            if (currNode.status == "alive" && currNode.name == "Elistra the Immortal") {
                elistras.push(currNode);
            }
            currNode = currNode.next;
        }
        return elistras;
    }

}

// minion constructor
function Minion(name, isGolden, side, attack, health, tribe, hasTaunt, hasDS, hasReborn, hasPoison, hasWindfury, numPlants, numBots) {
    this.name = name;
    this.isGolden = isGolden;
    this.side = side;
    this.attack = attack;
    this.health = health;
    this.tribe = (tribe != "all") ? [tribe] : ["all", "elemental", "pirate", "murloc", "mechanical", "dragon", "demon", "beast"];
    this.hasTaunt = hasTaunt;
    this.hasDS = hasDS;
    this.hasReborn = hasReborn;
    this.hasPoison = hasPoison;
    this.hasWindfury = hasWindfury;
    this.numPlants = numPlants;
    this.numBots = numBots;
    this.windfuryCounter = (hasWindfury) ? ((isGolden && windfuryNames.includes(name)) ? 4 : 2) : 1; // Maximum number of consecutive attacks
    this.status = "alive";
    this.next = null;
    this.prev = null;
    this.lastChild = this;
    this.tavern = (name == "Token") ? 1 : parseFloat(M.get(name)["techLevel"]);
    // return a copy of this minion
    this.copy = function () {
        var copy = new Minion(this.name, this.isGolden, this.side, this.attack, this.health, this.tribe[0], this.hasTaunt,
            this.hasDS, this.hasReborn, this.hasPoison, this.hasWindfury, this.numPlants, this.numBots);
        return copy;
    };
    // returns a vanilla copy (i.e. forgetting any buffs, so just 
    //use the arguments that were passed to the constructor?) -> for kangor's
    this.freshCopy = function () {
        return (name == "Token") ? new Minion(name, isGolden, side, attack, health, tribe, hasTaunt, hasDS, hasReborn, hasPoison, hasWindfury, numPlants, numBots)
            : plainMinion(name, side, isGolden);
    }
}

// returns a random integer between 0 and n (exclusive)
function randomInt(n) {
    return Math.floor(Math.random() * n);
}

// return one u.a.r. element of the input array
function randomEntry(input) {
    return input[randomInt(input.length)];
}

function logExampleWin() {
    if (winLog == "") {
        console.log("No win happened.");
    } else {
        console.log(winLog);
    }
}

function logExampleTie() {
    if (tieLog == "") {
        console.log("No tie happened.");
    } else {
        console.log(tieLog);
    }
}

function logExampleLoss() {
    if (lossLog == "") {
        console.log("No loss happened.");
    } else {
        console.log(lossLog);
    }
}

window.onclick = function (event) {
    /*var modal = document.getElementById("myModal");
    if (event.target == modal) {
        modal.style.display = "none";
    }*/
    var bestModal = document.getElementById("bestModal");
    var tieModal = document.getElementById("tieModal");
    var worstModal = document.getElementById("worstModal");
    if (event.target == bestModal) {
        bestModal.style.display = "none";
    }
    if (event.target == tieModal) {
        tieModal.style.display = "none";
    }
    if (event.target == worstModal) {
        worstModal.style.display = "none";
    }
}

function showBC() {
    if (bestLog == undefined) return;
    document.getElementById("best_modal_text").innerHTML = "";
    document.getElementById("best_modal_text").innerHTML = "<b>Best case scenario:</b><br>" + bestLog.replaceAll("\n", "<br>");
    document.getElementById("bestModal").style.display = "block";
}

function showTie() {
    if (tieLog == undefined) return;
    document.getElementById("tie_modal_text").innerHTML = "";
    var text = tieLog == "" ? "<br>No ties happened." : tieLog.replaceAll("\n", "<br>");
    document.getElementById("tie_modal_text").innerHTML = "<b>Example Tie:</b><br>" + text;
    document.getElementById("tieModal").style.display = "block";
}

function showWC() {
    if (worstLog == undefined) return;
    document.getElementById("worst_modal_text").innerHTML = "";
    document.getElementById("worst_modal_text").innerHTML = "<b>Worst case scenario:</b><br>" + worstLog.replaceAll("\n", "<br>");
    document.getElementById("worstModal").style.display = "block";
}

function getInputBoard() {

    var healthA = document.getElementById("hero_hp_a").value;
    var healthB = document.getElementById("hero_hp_b").value;
    var tavernA = document.getElementById("hero_tavern_a").value;
    var tavernB = document.getElementById("hero_tavern_b").value;
    var heroPowerA = document.getElementById("hp_a").value;
    var heroPowerB = document.getElementById("hp_b").value;

    var inputA = new Warband(healthA, tavernA, heroPowerA);
    var inputB = new Warband(healthB, tavernB, heroPowerB);
    for (var i = 8 - numA; i <= 6 + numA; i += 2) {
        /*var name = afterSpace(document.getElementById('a' + i).children[0].id);
        var minion = M.get(name);
        var nextMinion = new Minion(name, 'a', minion["attack"], minion["health"], minion["race"].toLowerCase(),
            tauntNames.includes(name),
            dsNames.includes(name),
            deathrattleNames.includes(name) || name == "Ghastcoiler");*/
        var card = getCard('a' + i);
        var minion = M.get(card.name);
        var nextMinion = new Minion(card.name, card.isGolden, 'a', parseFloat(card.attack), parseFloat(card.health), minion["race"].toLowerCase(),
            card.hasTaunt, card.hasDS, card.hasReborn, card.hasPoison, card.hasWindfury, parseFloat(card.numPlants), parseFloat(card.numBots));
        inputA.insertLast(nextMinion);
    }
    for (var i = 8 - numB; i <= 6 + numB; i += 2) {
        /*var name = afterSpace(document.getElementById('b' + i).children[0].id);
        var minion = M.get(name);
        var nextMinion = new Minion(name, 'b', minion["attack"], minion["health"], minion["race"].toLowerCase(),
            tauntNames.includes(name),
            dsNames.includes(name),
            deathrattleNames.includes(name) || name == "Ghastcoiler");*/
        var card = getCard('b' + i);
        var minion = M.get(card.name);
        var nextMinion = new Minion(card.name, card.isGolden, 'b', parseFloat(card.attack), parseFloat(card.health), minion["race"].toLowerCase(),
            card.hasTaunt, card.hasDS, card.hasReborn, card.hasPoison, card.hasWindfury, parseFloat(card.numPlants), parseFloat(card.numBots));
        inputB.insertLast(nextMinion);
    }
    return [inputA, inputB];
}

// To display "Computing..." while the simulations run (bc pot. time consuming)
function preSimulate() {
    var elem = document.getElementById("sim_button");
    elem.textContent = "Computing...";
    elem.disabled = true;
    /*document.getElementById("myModal").style.display = "block"; // Note: The below line only works if the modal is currently 
    document.getElementById('modal_text').scrollTo(0, 0); // Makes sure logs are shown from the start
    document.getElementById("myModal").style.display = "none";*/

    document.getElementById("bestModal").style.display = "block";
    document.getElementById('best_modal_text').scrollTo(0, 0);
    document.getElementById("bestModal").style.display = "none";

    document.getElementById("worstModal").style.display = "block";
    document.getElementById('worst_modal_text').scrollTo(0, 0);
    document.getElementById("worstModal").style.display = "none";


    //document.body.style.cursor = 'wait';
    setTimeout(function () {
        simulate();

        setTimeout(function () {
            document.getElementById("sim_button").textContent = "Run Simulation";
            document.getElementById("sim_button").disabled = false;
            //document.body.style.cursor = 'auto';
        }, 0);

    }, 0);

}

// run the fight numSimul times and display result statistics
function simulate() {

    var output = "TBD";
    winLog = "";
    tieLog = "";
    lossLog = "";
    bestLog = "";
    worstLog = "";

    var [inputA, inputB] = getInputBoard();
    //inputA.print();
    //inputB.print();

    var maxSimul = 100000;
    var defaultSimul = 1;
    var numSimul = document.getElementById("numSimul").value;
    if (isNaN(numSimul)) {
        numSimul = defaultSimul;
    } else {
        numSimul = Math.max(numSimul, 1);
        numSimul = Math.min(numSimul, maxSimul);
        numSimul = Math.floor(numSimul);
    }
    document.getElementById("numSimul").value = numSimul;

    var results = [0, 0, 0];
    var lethalOdds = [0, 0];
    var damagesA = [];
    var damagesB = [];
    bestSignedDmg = -100;
    worstSignedDmg = 100;
    firstFight = true;
    for (var i = 0; i < numSimul; i++) {
        currentLog = "\n";
        diedA = diedB = false;
        dmgA = dmgB = 0;
        A = inputA.copy();
        B = inputB.copy();
        A.nextAttacker = A.findInitialAttacker();
        B.nextAttacker = B.findInitialAttacker();
        if (A.nextAttacker == null) {
            // A has no minions or only eggs. If B does too, then termination will be detected in runSimulation()
            turn = "b";
        } else if (B.nextAttacker == null) {
            turn = "a";
        } else if (A.length() > B.length()) {
            turn = "a";
        } else if (A.length() < B.length()) {
            turn = "b";
        } else {
            turn = (randomInt(2) == 0) ? "a" : "b";
        }
        currentLog += ((turn == 'a') ? "Opponent goes" : "You go") + " first.\n";
        [attacker, defender] = (turn == 'a') ? [A, B] : [B, A];
        var result = runSimulation();
        results[result]++;
        if (diedA) lethalOdds[1]++;
        if (diedB) lethalOdds[0]++;
        if (dmgA > 0) damagesA.push(dmgA);
        if (dmgB > 0) damagesB.push(dmgB);
        //if (firstFight) console.log("dmgA = " + dmgA + ", dmgB = " + dmgB);
        if (firstFight) console.log("\nResult: " + result);
        currentLog += "Result: ";
        if (result == 1) {
            currentLog += " Tie.";
            if (tieLog == "") tieLog = currentLog;
        } else if (result == 0) {
            currentLog += " You won and dealt " + dmgB + " damage.";
            if (diedA) currentLog += " (Lethal)";
        } else if (result == 2) {
            currentLog += " You lost and took " + dmgA + " damage.";
            if (diedB) currentLog += " (Lethal)";
        }

        if (result == 1) {
            if (bestSignedDmg < 0) {
                bestLog = currentLog;
                bestSignedDmg = 0;
            }
            if (worstSignedDmg > 0) {
                worstLog = currentLog;
                worstSignedDmg = 0;
            }
        } else if (result == 0) {
            if (dmgB > bestSignedDmg) {
                bestLog = currentLog;
                bestSignedDmg = dmgB;
            }
            if (dmgB < worstSignedDmg) {
                worstLog = currentLog;
                worstSignedDmg = dmgB;
            }
        } else if (result == 2) {
            if (-dmgA < worstSignedDmg) {
                worstLog = currentLog;
                worstSignedDmg = -dmgA;
            }
            if (-dmgA > bestSignedDmg) {
                bestLog = currentLog;
                bestSignedDmg = -dmgA;
            }
        }

        if (winLog == "" && result == 0) winLog = currentLog;
        if (tieLog == "" && result == 1) tieLog = currentLog;
        if (lossLog == "" && result == 2) lossLog = currentLog;
        firstFight = false;
    }

    console.log(results);
    output = results.map(x => Math.round(10000 * (x / numSimul)) / 100);
    //output = "Win/Draw/Loss: [ " + output[0] + " | " + output[1] + " | " + output[2] + " ]";
    var lethalPercentages = lethalOdds.map(x => Math.round(10000 * (x / numSimul)) / 100);
    var damageOutputA = "-";

    // Bob's buddy shows middle 80% -> not really quartiles 
    if (damagesA.length > 0) {
        damagesA.sort(function (a, b) { return a - b; }); // want to sort NUMBERS not strings...
        var lowerQuartile = Math.floor(damagesA.length * 0.1);
        var upperQuartile = Math.floor(damagesA.length * 0.9);
        var lowerDmg = damagesA[lowerQuartile];
        var upperDmg = damagesA[upperQuartile];
        if (lowerDmg == upperDmg) {
            damageOutputA = upperDmg;
        } else {
            damageOutputA = lowerDmg + "-" + upperDmg;
        }
    }
    var damageOutputB = "-";
    if (damagesB.length > 0) {
        damagesB.sort(function (a, b) { return a - b; });
        var lowerQuartile = Math.floor(damagesB.length * 0.1);
        var upperQuartile = Math.floor(damagesB.length * 0.9);
        var lowerDmg = damagesB[lowerQuartile];
        var upperDmg = damagesB[upperQuartile];
        if (lowerDmg == upperDmg) {
            damageOutputB = upperDmg;
        } else {
            damageOutputB = lowerDmg + "-" + upperDmg;
        }
    }
    //output += "<br>Average Damage: [ " + damageOutputB + " | " + damageOutputA + " ]";
    //output += "<br>Lethal: [ " + lethalPercentages[1] + " | " + lethalPercentages[0] + " ]";

    /*var elem = document.getElementById("sim_results");
    elem.innerHTML = output;*/

    document.getElementById("win_content").textContent = output[0] + "%";
    document.getElementById("tie_content").textContent = output[1] + "%";
    document.getElementById("loss_content").textContent = output[2] + "%";
    document.getElementById("dealt_content").textContent = damageOutputB;
    document.getElementById("taken_content").textContent = damageOutputA;
    document.getElementById("opp_dies_content").textContent = lethalPercentages[1] + "%";
    document.getElementById("you_die_content").textContent = lethalPercentages[0] + "%";

}

// return whether the game is won by A or B, tie or if the fight continues
// -1 == fight continues, 0 == B wins (player always plays the lower warband), 1 == tie, 2 == A wins
function checkTermination() {

    var result;
    if (A.length() == 0 && B.length() == 0) {
        result = 1;
    } else if (A.length() == 0) {
        result = 0;
        dmgB = B.countDamage();
        diedA = dmgB >= A.health;
    } else if (B.length() == 0) {
        result = 2;
        dmgA = A.countDamage();
        diedB = dmgA >= B.health;
    } else {
        var allZeroAtk = true;
        var currNode = A.head;
        while (currNode != null) {
            if (currNode.status == 'alive' && currNode.attack > 0) {
                allZeroAtk = false;
                break;
            }
            currNode = currNode.next;
        }
        var currNode = B.head;
        while (currNode != null) {
            if (currNode.status == 'alive' && currNode.attack > 0) {
                allZeroAtk = false;
                break;
            }
            currNode = currNode.next;
        }
        if (allZeroAtk) {
            result = 1;
        } else {
            result = -1;
        }
    }
    return result;

}

// run the fight once
function runSimulation() {

    var firstAttack = true;
    startOfCombat();

    while (true) {
        if (firstFight) {
            console.log(A.toString());
            console.log(B.toString());
        };
        currentLog += "\n### " + A.toString() + "\n";
        currentLog += "### " + B.toString() + "\n";
        currentLog += "It's your " + ((turn == 'a') ? "opponent's" : "") + " turn: ";

        var status = checkTermination();
        //console.log("The status is " + status);
        if (status != -1) return status;

        var hitter = attacker.nextAttacker;
        // handle case where a red whelp kills the first minion of the player going first
        if (hitter.status != "alive") {
            hitter = attacker.findNextAttacker();
            if (hitter == null) { // current attacker can't attack (has at most eggs), but since fight isn't over can swap turns
                [attacker, defender] = [defender, attacker];
                turn = (turn == 'a') ? 'b' : 'a';
                hitter = attacker.nextAttacker;
                if (hitter.status != "alive") {
                    hitter = attacker.findNextAttacker(); // this CANNOT be null (else termination detection is bugged)
                }
            }
        }
        var target;
        if (hitter.name == "Zapp Slywick") {
            target = defender.findZappTarget();
        } else {
            target = defender.findTarget(); // since the fight is not over this must return some minion
        }

        //if (firstFight) console.log(turn + " is attacking: " + hitter.name + " -> " + target.name);
        whenAttack(hitter, target);
        whenSthAttacks(hitter);

        // But the attack may not go through because of elistra!
        // Elistra assumption: When a taunt minion is attacked, an uniformly random elistra gets attacked instead
        var defenderElistras = defender.findElistras();
        if (defenderElistras.length > 0 && target.hasTaunt) target = randomEntry(defenderElistras);

        hitSimultaneously(hitter, target);
        // better to trigger overkills here than in hit, because overkill only triggers on attacks
        if (target.health < 0) whenOverkill(hitter, target);

        // loop until no more deaths found (may need more than once bc deathrattles can trigger deaths)
        while (attacker.collectDead() || defender.collectDead()) {
            attacker.triggerDeathrattles();
            defender.triggerDeathrattles();
        }
        // Now there are only alive >0 minions and done minions left in the LLs
        //console.log("After the attack the list lengths are A: " + A.length() + " and B:" + B.length());
        status = checkTermination();
        if (status != -1) {
            if (firstFight) {
                console.log("Final board state:");
                console.log(A.toString());
                console.log(B.toString());
            }
            //currentLog += "Final board state:\n";
            currentLog += "\n### " + A.toString() + "\n";
            currentLog += "### " + B.toString() + "\n";
            return status;
        }

        //if (firstFight) console.log("After hit and collectDead:");
        //if (firstFight) {A.print(); B.print()};
        //A.printComplete();
        //B.printComplete();

        hitter.windfuryCounter--;
        if (hitter.status == 'alive' && hitter.windfuryCounter > 0) {
            // The current hitter can attack again.
            if (firstFight) console.log("The next attack (Windfury!) is " + hitter.name + " again.");

        } else {
            // The current hitter either died or cannot attack again -> Switch to opponent if possible.

            var num = 1;
            if (windfuryNames.includes(hitter.name)) {
                num *= 2;
                if (hitter.isGolden && windfuryNames.includes(hitter.name)) num *= 2; // Mega-windfury (but golden amalgadon doesn't get it)
            }
            hitter.windfuryCounter = num; // reset counter


            var defenderNewAttacker;
            // For the very first attack there is no need to advance the attack pointer (want left-most minion)
            //... unless the first attacker already died
            if (firstAttack && defender.nextAttacker != null && defender.nextAttacker.status == "alive") {
                defenderNewAttacker = defender.nextAttacker;
            } else {
                defenderNewAttacker = defender.findNextAttacker();
            }
            firstAttack = false;

            if (firstFight && defenderNewAttacker != null) console.log("The next attacker is " + defenderNewAttacker.name);
            //console.log("Defender next attacker: " + defenderNewAttacker);
            if (defenderNewAttacker != null) {
                //if (firstFight) console.log("It's the other guy's turn now");
                // opponent can attack, his turn is next
                defender.nextAttacker = defenderNewAttacker;
                turn = (turn == 'a') ? 'b' : 'a';
                [attacker, defender] = [defender, attacker];
                defender.cleanUp();
            } else {
                if (firstFight) console.log("Wow, it's my turn again.");
                // opponent can't attack, we go again. If we cannot attack either, the fight must be over
                attacker.nextAttacker = attacker.findNextAttacker();
                attacker.cleanUp();
            }

        }

        // Note: Can only call cleanup after updating this player's next attacker, so not after each ply.
        // However, need to remove logically dead minions from specialMinions as their effect cannot longer
        // apply.
        A.cleanSpecialMinions();
        B.cleanSpecialMinions();

    }

}

// what happens at the beginning of the fight, before the first attack
function startOfCombat() {

    // Alive red whelps trigger their effect. Order: Just like minion attack order during fights. DRs trigger in between.
    // Only initial dragon count matters https://youtu.be/JiRNz35saLk?t=735 
    var myWhelps = [];
    var theirWhelps = [];
    var myDragonCount = 0;
    var theirDragonCount = 0;

    var currNode = A.head;
    while (currNode != null) {
        if (currNode.tribe.includes("dragon")) myDragonCount++;
        if (currNode.name == "Red Whelp") myWhelps.push(currNode);
        currNode = currNode.next;
    }
    currNode = B.head;
    while (currNode != null) {
        if (currNode.tribe.includes("dragon")) theirDragonCount++;
        if (currNode.name == "Red Whelp") theirWhelps.push(currNode);
        currNode = currNode.next;
    }

    var myTurn = false; // determine whether I spit first or not
    if (myWhelps.length > theirWhelps.length) {
        myTurn = true;
    } else if (myWhelps.length < theirWhelps.length) {
        myTurn = false;
    } else if (randomInt(2) == 0) {
        myTurn = true;
    }

    var myIndex = 0;
    var theirIndex = 0;

    while (myIndex < myWhelps.length || theirIndex < theirWhelps.length) {

        // if it's my turn, find the next alive red whelp: it spits
        if (myTurn) {
            while (myIndex < myWhelps.length && myWhelps[myIndex].status != 'alive') {
                myIndex++;
            }
            if (myIndex < myWhelps.length) {
                var num = myWhelps[myIndex].isGolden ? 2 : 1;
                while (num--) {
                    var target = B.randomAlive();
                    hit(myWhelps[myIndex], target, myDragonCount);
                }
                myIndex++;
                while (A.collectDead() || B.collectDead()) { // trigger DRs in between
                    A.triggerDeathrattles();
                    B.triggerDeathrattles();
                }
            }
            // swap turns if the other guy still has red whelps left
            if (theirIndex < theirWhelps.length) {
                myTurn = false;
            }
        } else {
            while (theirIndex < theirWhelps.length && theirWhelps[theirIndex].status != 'alive') {
                theirIndex++;
            }
            if (theirIndex < theirWhelps.length) {
                var num = theirWhelps[theirIndex].isGolden ? 2 : 1;
                while (num--) {
                    var target = A.randomAlive();
                    hit(theirWhelps[theirIndex], target, theirDragonCount);
                }
                theirIndex++;
                while (A.collectDead() || B.collectDead()) {
                    A.triggerDeathrattles();
                    B.triggerDeathrattles();
                }
            }
            if (myIndex < myWhelps.length) {
                myTurn = true;
            }
        }

    }

    // Note: With whelps can no longer assume that the first minion of the player going first can attack. (It may die to a whelp)


    // Apply start of combat aura buffs
    for (var specialMinion of attacker.specialMinions) {
        if (auraMinions.includes(specialMinion.name)) auraBuffAll(specialMinion);
    }
    for (var specialMinion of defender.specialMinions) {
        if (auraMinions.includes(specialMinion.name)) auraBuffAll(specialMinion);
    }

}


// applies the input minion's aura buff on all friendly minions (start of combat or on summon)
function auraBuffAll(auraMinion) {

    var mySide = (auraMinion.side == 'a') ? A : B;
    var theirSide = (auraMinion.side == 'a') ? B : A;

    var currNode = mySide.head;
    while (currNode != null) {
        auraBuff(auraMinion, currNode);
        if (auraMinion.name == "Old Murk-Eye" && currNode.tribe.includes("murloc")
            && auraMinion != currNode && currNode.status == "alive") {
            auraMinion.attack += auraMinion.isGolden ? 2 : 1;
        }
        currNode = currNode.next;
    }

    currNode = theirSide.head;
    while (currNode != null) {
        if (auraMinion.name == "Old Murk-Eye" && currNode.tribe.includes("murloc")
            && auraMinion != currNode && currNode.status == "alive") {
            auraMinion.attack += auraMinion.isGolden ? 2 : 1;
        }
        currNode = currNode.next;
    }

}

// aura minion died: debuff all friendly minions (but to at least 1hp)
function auraDebuffAll(auraMinion) {

    var mySide = (auraMinion.side == 'a') ? A : B;

    var currNode = mySide.head;
    while (currNode != null) {
        auraDebuff(auraMinion, currNode);
        currNode = currNode.next;
    }

}

// Apply the auroMinion's buff to recipient, if possible
function auraBuff(auraMinion, recipient) {

    var factor = auraMinion.isGolden ? 2 : 1;

    switch (auraMinion.name) {
        case "Murloc Warleader":
            if (recipient.tribe.includes("murloc") && recipient != auraMinion) {
                recipient.attack += 2 * factor;
            }
            break;
        case "Southsea Captain":
            if (recipient.tribe.includes("pirate") && recipient != auraMinion) {
                recipient.attack += 1 * factor;
                recipient.health += 1 * factor;
            }
            break;
        case "Siegebreaker":
            if (recipient.tribe.includes("demon") && recipient != auraMinion) {
                recipient.attack += 1 * factor;
            }
            break;
        case "Mal'Ganis":
            if (recipient.tribe.includes("demon") && recipient != auraMinion) {
                recipient.attack += 2 * factor;
                recipient.health += 2 * factor;
            }
            break;
    }

}

// Debuff a potential recipient of a newly deceased aura minion
function auraDebuff(auraMinion, recipient) {

    var factor = auraMinion.isGolden ? 2 : 1;

    switch (auraMinion.name) {
        case "Murloc Warleader":
            if (recipient.tribe.includes("murloc") && recipient != auraMinion) {
                recipient.attack -= 2 * factor;
            }
            break;
        case "Southsea Captain":
            if (recipient.tribe.includes("pirate") && recipient != auraMinion) {
                recipient.attack -= 1 * factor;
                recipient.health = Math.max(1, recipient.health - 1 * factor);
            }
            break;
        case "Siegebreaker":
            if (recipient.tribe.includes("demon") && recipient != auraMinion) {
                recipient.attack -= 1 * factor;
            }
            break;
        case "Mal'Ganis":
            if (recipient.tribe.includes("demon") && recipient != auraMinion) {
                recipient.attack -= 2 * factor;
                recipient.health = Math.max(1, recipient.health - 2 * factor);
            }
            break;
    }

}

// X attacks Y, they deal damage to each other SIMULTANEOUSLY
function hitSimultaneously(X, Y) {

    if (firstFight) console.log("(" + turn + "): " + X.name + " hits " + Y.name + " for " + X.attack);
    if (firstFight) console.log("(" + turn + "): " + Y.name + " hits " + X.name + " for " + Y.attack);

    /*currentLog += "(" + turn + "): " + X.name + " hits " + Y.name + " for " + X.attack + "\n";
    currentLog += "(" + turn + "): " + Y.name + " hits " + X.name + " for " + Y.attack + "\n";*/
    currentLog += X.name + " attacks " + Y.name + ".\n";

    // only the attacked can have attack 0
    if (Y.attack == 0) {
        if (Y.hasDS) {
            Y.hasDS = false;
            whenSthLosesDS(Y);
        } else {
            Y.health -= X.attack;
            whenDamaged(Y);
            if (X.hasPoison) {
                //Y.health = 0;
                Y.status = "dead";
                whenSthDies(Y);
            }
            if (Y.health <= 0 || Y.status == 'dead') whenKill(X, Y);
        }
    } else { // both have attack > 0

        // Need all these booleans to make the actual attack happen first, and have all the
        // DS loss/damage/kill triggers happen afterwards, without these being affected by one another
        var yHadDS = Y.hasDS;
        var xHadDS = X.hasDS;
        //var xKilledY = false; // Actually don't want these (-> imp mama res'es mal'ganis)
        //var yKilledX = false;
        if (Y.hasDS) {
            Y.hasDS = false;
        }
        if (X.hasDS) {
            X.hasDS = false;
        }
        if (!yHadDS) {
            Y.health -= X.attack;
            //if (Y.health <= 0) xKilledY = true;
        }
        if (!xHadDS) {
            X.health -= Y.attack;
            //if (X.health <= 0) yKilledX = true;
        }

        afterAttack(X, Y); // Not sure where exactly this belongs. Can't be in outer loop because the macaw can't come back from the dead.

        if (yHadDS) whenSthLosesDS(Y);
        if (xHadDS) whenSthLosesDS(X);
        if (!yHadDS) whenDamaged(Y);
        if (!xHadDS) whenDamaged(X);
        if (!yHadDS && X.hasPoison) {
            //Y.health = 0;
            Y.status = "dead";
            whenSthDies(Y);
        }
        if (!xHadDS && Y.hasPoison) {
            //X.health = 0;
            X.status = "dead";
            whenSthDies(X);
        }
        if (Y.health <= 0 || Y.status == 'dead') whenKill(X, Y);
        if (X.health <= 0 || X.status == 'dead') whenKill(Y, X);
        // currently doesn't work if Y's health is reduced by some other minion in the process
        // meaning it wasn't really X that killed Y

    }

    if (Y.name == "Yo-Ho-Ogre" && Y.health > 0) {
        var myBand = (X.side == 'a') ? A : B;
        var target = myBand.findTarget();
        if (target != null) hitSimultaneously(Y, target);
    }

}

// minion X deals k damage to minion Y
function hit(X, Y, k) {
    if (firstFight) console.log("(" + turn + "): " + X.name + " hits " + Y.name + " for " + k);
    //currentLog += "(" + turn + "): " + X.name + " hits " + Y.name + " for " + k + "\n";
    currentLog += X.name + " hits " + Y.name + " for " + k + ".\n";
    if (k == 0) {
        return;
    } else if (Y.hasDS) {
        Y.hasDS = false;
        whenSthLosesDS(Y);
    } else {
        Y.health -= k;
        whenDamaged(Y);
        if (X.hasPoison) {
            //Y.health = 0;
            Y.status = "dead";
            whenSthDies(Y);
        }
        if (Y.health <= 0 || Y.status == 'dead') whenKill(X, Y);
    }
}

// summon the minions passed in an array after afterMinion (potentially multiple copies if khadgar on board)
function summon(minions, afterMinion) {

    //for (var i = 0; i < minions.length; i++) console.log("Summoning " + minions[i].name);

    var myBand = (afterMinion.side == 'a') ? A : B;
    var summonedMinions = [];
    var numCopies = 1;
    for (var specialMinion of myBand.specialMinions) {
        if (specialMinion.status == "alive" && specialMinion.name == "Khadgar") {
            var khadgarFactor = specialMinion.isGolden ? 3 : 2;
            numCopies *= khadgarFactor;
        }
    }
    numCopies--;

    for (var i = 0; i < minions.length; i++) {
        if (myBand.length() < 7) {
            myBand.insertAfter(minions[i], afterMinion);
            // apply potential aura buffs to this minion (not again to Khadgar copies, though)
            for (var specialMinion of myBand.specialMinions) {
                auraBuff(specialMinion, minions[i]);
            }
            summonedMinions.push(minions[i]);

            var num = Math.min(numCopies, 7 - myBand.length());
            // if (firstFight) console.log("Inserting " + (num+1) + " minions!");
            for (var j = 0; j < num; j++) {
                var copyMinion = minions[i].copy();
                myBand.insertAfter(copyMinion, afterMinion);
                summonedMinions.push(minions[i]);
            }
        } else {
            break;
        }
    }

    /*if (firstFight && summonedMinions.length > 0) {
        var log = afterMinion.name + " summons ";
        for (var i = 0; i < summonedMinions.length; i++) {
            log += summonedMinions[i].name;
            if (i+1 < summonedMinions.length) log += ", ";
        }
        console.log(log);
    }*/

    return summonedMinions;

}




// Trigger the input minion's deathrattle
function deathrattle(minion) {

    var myBand = (minion.side == 'a') ? A : B;
    var theirBand = (minion.side == 'a') ? B : A;
    var myFreeSpaces = 7 - myBand.length();
    var theirFreeSpaces = 7 - theirBand.length();
    var minionsToSummon = [];
    // Deathrattle summons happen in order: Natural summon, bots, plants (?)
    /*console.log(minion.name + " contains " + minion.numPlants + " plants " + minion.numBots + " bots!");*/
    for (var i = 0; i < Math.min(7, minion.numPlants); i++) {
        minionsToSummon.push(new Minion("Token", false, minion.side, 1, 1, "none", false, false, false, false, false, 0, 0));
    }
    for (var i = 0; i < Math.min(7, minion.numBots); i++) {
        minionsToSummon.push(new Minion("Token", false, minion.side, 1, 1, "mechanical", false, false, false, false, false, 0, 0));
    }
    //if (minionsToSummon.length > 0) console.log("summoning extra stuff!!!!");
    var factor = (minion.isGolden) ? 2 : 1;

    switch (minion.name) {
        case "Kindly Grandmother":
            minionsToSummon.unshift(new Minion("Token", false, minion.side, 3 * factor, 2 * factor, "beast", false, false, false, false, false, 0, 0));
            break;
        case "Harvest Golem":
            minionsToSummon.unshift(new Minion("Token", false, minion.side, 2 * factor, 1 * factor, "mechanical", false, false, false, false, false, 0, 0));
            break;
        case "Mechano-Egg":
            minionsToSummon.unshift(new Minion("Token", false, minion.side, 8 * factor, 8 * factor, "mechanical", false, false, false, false, false, 0, 0));
            break;
        case "Imprisoner":
            minionsToSummon.unshift(new Minion("Token", false, minion.side, 1 * factor, 1 * factor, "demon", false, false, false, false, false, 0, 0));
            break;
        case "Scallywag":
            minionsToSummon.unshift(new Minion("Token", false, minion.side, 1 * factor, 1 * factor, "pirate", false, false, false, false, false, 0, 0));
            // Make the summoned copies attack directly
            /*if (myFreeSpaces >= 1) {
                var newMinion = new Minion("Token", minion.side, 1, 1, "pirate", false, false, false, false, false, 0, 0);
                myBand.insertAfter(newMinion, minion);
                var target = theirBand.findTarget();
                if (target != null) hitSimultaneously(newMinion, target);
            }*/
            break;
        case "Replicating Menace":
            var num = 3;
            while (num--) minionsToSummon.unshift(new Minion("Token", false, minion.side, 1 * factor, 1 * factor, "mechanical", false, false, false, false, false, 0, 0));
            break;
        case "Voidlord":
            var num = 3;
            while (num--) minionsToSummon.unshift(new Minion("Token", false, minion.side, 1 * factor, 3 * factor, "demon", true, false, false, false, false, 0, 0));
            break;
        case "Ring Matron":
            var num = 2;
            while (num--) minionsToSummon.unshift(new Minion("Token", false, minion.side, 3 * factor, 2 * factor, "demon", false, false, false, false, false, 0, 0));
            break;
        case "Infested Wolf":
            var num = 2;
            while (num--) minionsToSummon.unshift(new Minion("Token", false, minion.side, 1 * factor, 1 * factor, "beast", false, false, false, false, false, 0, 0));
            break;
        case "Savannah Highmane":
            var num = 2;
            while (num--) minionsToSummon.unshift(new Minion("Token", false, minion.side, 2 * factor, 2 * factor, "beast", false, false, false, false, false, 0, 0));
            break;
        case "Rat Pack":
            var num = Math.min(minion.attack, 7);
            while (num--) minionsToSummon.unshift(new Minion("Token", false, minion.side, 1 * factor, 1 * factor, "beast", false, false, false, false, false, 0, 0));
            break;
        // HANDLE THIS CASE SEPARATELY (i.e. summon # Khadgar many einhorns) as this is the only minion summoning stuff for the opponent
        case "The Beast":
            var numCopies = 1;
            for (var specialMinion of myBand.specialMinions) {
                if (specialMinion.status == "alive" && specialMinion.name == "Khadgar") {
                    var khadgarFactor = specialMinion.isGolden ? 3 : 2;
                    numCopies *= khadgarFactor;
                }
            }
            numCopies = Math.min(theirFreeSpaces, numCopies);
            while (numCopies--) {
                var newMinion = new Minion("Token", false, minion.side, 3, 3, "none", false, false, false, false, false, 0, 0);
                theirBand.insertLast(newMinion, minion);
            }
            break;
        case "Kaboom Bot":
            var num = 1 * factor;
            while (num--) {
                var target = theirBand.randomAlive();
                if (target != null) { // if all their minions are dead will return undefined == null
                    hit(minion, target, 4);
                }
            }
            break;
        case "Fiendish Servant":
            var num = 1 * factor;
            while (num--) {
                var target = myBand.randomAlive();
                if (target != null) {
                    target.attack += minion.attack;
                }
            }
            break;

        case "Selfless Hero":
            var num = 1 * factor;
            while (num--) {
                var targets = [];
                var currNode = myBand.head;
                while (currNode != null) {
                    if (currNode.status == "alive" && currNode.health > 0 && !currNode.hasDS) targets.push(currNode);
                    currNode = currNode.next;
                }
                var target = randomEntry(targets);
                if (target != null) {
                    target.hasDS = true;
                }
            }
            break;
        case "Spawn of N'Zoth":
            var num = 1 * factor;
            while (num--) {
                var currNode = myBand.head;
                while (currNode != null) {
                    if (currNode.status == "alive") { // don't check for hp >0, bc can buff out of death
                        currNode.attack += 1;
                        currNode.health += 1;
                    }
                    currNode = currNode.next;
                }
            }
            break;
        case "Unstable Ghoul":
            var num = 1 * factor;
            while (num--) {
                var myCurrentNodes = myBand.currentNodes(); // 'snapshot', as minions may be summoned while iterating
                var theirCurrentNodes = theirBand.currentNodes();
                for (var i = 0; i < myCurrentNodes.length; i++) {
                    var currNode = myCurrentNodes[i];
                    if (currNode.status == "alive") { // check for hp > 0 or not? i.e. can proc an imp gang boss at -1 hp?
                        hit(minion, currNode, 1);
                    }
                }
                for (var i = 0; i < theirCurrentNodes.length; i++) {
                    var currNode = theirCurrentNodes[i];
                    if (currNode.status == "alive") {
                        hit(minion, currNode, 1);
                    }
                }
            }
            break;
        case "King Bagurgle":
            var num = 1 * factor;
            while (num--) {
                var currNode = myBand.head;
                while (currNode != null) {
                    if (currNode.status == "alive" && currNode.tribe.includes("murloc")) {
                        currNode.attack += 2;
                        currNode.health += 2;
                    }
                    currNode = currNode.next;
                }
            }
            break;
        case "Goldrinn, the Great Wolf":
            var num = 1 * factor;
            while (num--) {
                var currNode = myBand.head;
                while (currNode != null) {
                    if (currNode.status == "alive" && currNode.tribe.includes("beast")) {
                        currNode.attack += 5;
                        currNode.health += 5;
                    }
                    currNode = currNode.next;
                }
            }
            break;
        case "Nadina the Red":
            var currNode = myBand.head;
            while (currNode != null) {
                if (currNode.status == "alive" && currNode.tribe.includes("dragon")) {
                    currNode.hasDS = true;
                }
                currNode = currNode.next;
            }
            break;
        case "The Tide Razor":
            var num = 3 * factor;
            while (num--) minionsToSummon.unshift(plainMinion(randomEntry(pirateNames), minion.side, false));
            break;
        case "Ghastcoiler":
            var num = 2 * factor;
            while (num--) minionsToSummon.unshift(plainMinion(randomEntry(deathrattleNames), minion.side, false));
            break;
        case "Gentle Djinni":
            var num = 1 * factor;
            var legalElementals = [];
            for (var name of elementalNames) {
                if (M.get(name)["techLevel"] <= myBand.tavern) legalElementals.push(name);
            }
            while (num--) minionsToSummon.unshift(plainMinion(randomEntry(legalElementals), minion.side, false));
            break;
        case "Sneed's Old Shredder":
            var num = 1 * factor;
            while (num--) minionsToSummon.unshift(plainMinion(randomEntry(legendaryCards), minion.side, false));
            break;
        case "Piloted Shredder":
            var num = 1 * factor;
            while (num--) minionsToSummon.unshift(plainMinion(randomEntry(twoManaCards), minion.side, false));
            break;
        case "Kangor's Apprentice":
            var num = Math.min(2 * factor, myBand.deadMechs.length);
            for (var i = num - 1; i >= 0; i--) { // s.t. resummoned in order of death
                minionsToSummon.unshift(myBand.deadMechs[i].freshCopy());
            }
            break;

    }

    // Can't handle reborn in deathrattle because then it erraneously works with baron... !!!!!!!!!!!!!
    /*if (minion.hasReborn) {
        var rebornMinion = plainMinion(minion.name, minion.side, minion.isGolden);
        rebornMinion.health = 1;
        rebornMinion.hasReborn = false;
        minionsToSummon.push(rebornMinion);
    }*/

    var summonedMinions = summon(minionsToSummon, minion);
    // make swabbies attack
    switch (minion.name) {
        case "Scallywag":
            for (var i = 0; i < summonedMinions.length; i++) {
                var target = theirBand.findTarget();
                //console.log(summonedMinions[i].name);
                //console.log(target.name);
                if (target != null) hitSimultaneously(summonedMinions[i], target);
            }
            break;
    }

}

function whenSthSummoned(minion) {

    var myBand = (minion.side == 'a') ? A : B;
    var theirBand = (minion.side == 'a') ? B : A;
    var factor = minion.isGolden ? 2 : 1;

    for (var specialMinion of myBand.specialMinions) {
        switch (specialMinion.name) {
            case "Murloc Tidecaller":
                if (minion.tribe.includes("murloc") && minion != specialMinion) specialMinion.attack += 1 * factor;
                break;
            case "Pack Leader":
                if (minion.tribe.includes("beast")) minion.attack += 2 * factor;
                break;
            case "Mama Bear":
                if (minion.tribe.includes("beast") && minion != specialMinion) {
                    minion.attack += 4 * factor;
                    minion.health += 4 * factor;
                }
                break;
            case "Deflect-o-Bot":
                if (minion.tribe.includes("mechanical") && minion != specialMinion) {
                    specialMinion.hasDS = true;
                    specialMinion.attack += 1 * factor;
                }
                break;
            case "Old Murk-Eye":
                if (minion.tribe.includes("murloc") && minion != specialMinion) {
                    specialMinion.attack += specialMinion.isGolden ? 2 : 1;
                }
                break;
            case "Bigfernal":
                if (minion.tribe.includes("demon") && minion != specialMinion) {
                    specialMinion.attack += specialMinion.isGolden ? 2 : 1;
                    specialMinion.health += specialMinion.isGolden ? 2 : 1;
                }
        }
    }

    for (var specialMinion of theirBand.specialMinions) {
        switch (specialMinion.name) {
            case "Old Murk-Eye":
                if (minion.tribe.includes("murloc") && minion != specialMinion) {
                    specialMinion.attack += specialMinion.isGolden ? 2 : 1;
                }
                break;
        }
    }

}

function whenSthAttacks(minion) {

    var myBand = (minion.side == 'a') ? A : B;
    var theirBand = (minion.side == 'a') ? B : A;
    var factor = minion.isGolden ? 2 : 1;

    for (var specialMinion of myBand.specialMinions) {
        switch (specialMinion.name) {
            case "Ripsnarl Captain":
                if (minion.tribe.includes("pirate") && minion != specialMinion) { // can't buff himself
                    minion.attack += 2 * factor;
                    minion.health += 2 * factor;
                }
                break;
            case "Dread Admiral Eliza":
                if (minion.tribe.includes("pirate")) {
                    var currNode = myBand.head;
                    while (currNode != null) {
                        currNode.attack += 2 * factor;
                        currNode.health += 1 * factor;
                        currNode = currNode.next;
                    }
                }
                break;
        }
    }

}

function whenSthLosesDS(minion) {

    var myBand = (minion.side == 'a') ? A : B;
    var theirBand = (minion.side == 'a') ? B : A;
    var factor = minion.isGolden ? 2 : 1;

    for (var specialMinion of myBand.specialMinions) {
        switch (specialMinion.name) {
            // these 2 can buff themselves.
            case "Bolvar, Fireblood":
                specialMinion.attack += 2 * factor;
                break;
            case "Drakonid Enforcer":
                specialMinion.attack += 2 * factor;
                specialMinion.health += 2 * factor;
                break;
        }
    }

}

// handle effects that trigger because X just killed Y
function whenSthKills(X, Y) {

    var myBand = (X.side == 'a') ? A : B;
    var theirBand = (X.side == 'a') ? B : A;
    var factor = X.isGolden ? 2 : 1;

    for (var specialMinion of myBand.specialMinions) {
        switch (specialMinion.name) {
            case "Waxrider Togwaggle":
                if (X.tribe.includes("dragon")) {
                    specialMinion.attack += 2 * (specialMinion.isGolden ? 2 : 1);
                    specialMinion.health += 2 * (specialMinion.isGolden ? 2 : 1);
                }
                break;
        }
    }

}

function whenSthDies(minion) {

    var myBand = (minion.side == 'a') ? A : B;
    var theirBand = (minion.side == 'a') ? B : A;
    var factor = minion.isGolden ? 2 : 1;

    for (var specialMinion of myBand.specialMinions) {
        var specialFactor = specialMinion.isGolden ? 2 : 1;
        switch (specialMinion.name) {
            case "Soul Juggler":
                if (specialMinion.health > 0 && minion.tribe.includes("demon")) {
                    var num = 1 * factor;
                    while (num--) {
                        var target = theirBand.randomAlive();
                        if (target != null) hit(specialMinion, target, 3);
                    }
                }
                break;
            case "Scavenging Hyena":
                if (minion.tribe.includes("beast") && minion != specialMinion) {
                    specialMinion.attack += 2 * factor;
                    specialMinion.health += 1 * factor;
                }
                break;
            case "Junkbot":
                if (minion.tribe.includes("mechanical") && minion != specialMinion) {
                    specialMinion.attack += 2 * factor;
                    specialMinion.health += 2 * factor;
                }
                break;
            case "Old Murk-Eye":
                if (minion.tribe.includes("murloc") && minion != specialMinion) {
                    specialMinion.attack -= specialFactor;
                }
                break;
            case "Qiraji Harbinger":
                if (minion.hasTaunt && minion != specialMinion) { // dying qiraji doesn't buff (?)
                    for (var neighbor of myBand.neighbors(minion)) {
                        neighbor.attack += 2 * specialFactor;
                        neighbor.health += 2 * specialFactor;
                    }
                }
                break;
        }
    }

    for (var specialMinion of theirBand.specialMinions) {
        switch (specialMinion.name) {
            case "Old Murk-Eye":
                if (minion.tribe.includes("murloc") && minion != specialMinion) {
                    specialMinion.attack -= specialMinion.isGolden ? 2 : 1;
                }
                break;
        }
    }

    if (minion.tribe.includes("mechanical") && myBand.deadMechs.length < 4) {
        myBand.deadMechs.push(minion);
    }

}


// return a plain minion object with the input name (used for deathrattles)
function plainMinion(name, band, isGolden) {
    var minion = M.get(name);
    var factor = isGolden ? 2 : 1;
    var newMinion = new Minion(name, isGolden, band, minion["attack"] * factor, minion["health"] * factor, minion["race"].toLowerCase(),
        tauntNames.includes(name),
        dsNames.includes(name),
        rebornNames.includes(name),
        poisonNames.includes(name),
        windfuryNames.includes(name),
        0,
        0);
    return newMinion;
}

function whenDamaged(minion) {

    var myBand = (minion.side == 'a') ? A : B;
    var theirBand = (minion.side == 'a') ? B : A;
    var myFreeSpaces = 7 - myBand.length();
    var theirFreeSpaces = 7 - theirBand.length();
    var factor = minion.isGolden ? 2 : 1;
    var minionsToSummon = [];

    switch (minion.name) {
        case "Imp Gang Boss":
            minionsToSummon.push(new Minion("Token", false, minion.side, 1 * factor, 1 * factor, "demon", false, false, false, false, false, 0, 0));
            summon(minionsToSummon, minion);
            break;
        case "Security Rover":
            minionsToSummon.push(new Minion("Token", false, minion.side, 2 * factor, 3 * factor, "mechanical", true, false, false, false, false, 0, 0));
            summon(minionsToSummon, minion);
            break;
        case "Imp Mama":
            var num = 1 * factor;
            while (num--) {
                minionsToSummon.push(plainMinion(randomEntry(demonNames), minion.side, false));
            }
            summon(minionsToSummon, minion);
            break;
    }

    minion.lastChild = minion; // if it gets hit again minions go directly to the right again

}

// before X attacks Y
function whenAttack(X, Y) {

    var myBand = (X.side == 'a') ? A : B;
    var theirBand = (X.side == 'a') ? B : A;

    var maxAttack = 100000; // might want to cap this

    switch (X.name) {
        case "Glyph Guardian":
            var multiplier = X.isGolden ? 3 : 2;
            X.attack = Math.min(X.attack * multiplier, maxAttack);
            break;
    }

    // handle stuff that triggers when a taunt gets attacked
    if (Y.hasTaunt) {
        for (var specialMinion of theirBand.specialMinions) {
            var factor = specialMinion.isGolden ? 2 : 1;
            switch (specialMinion.name) {
                case "Arm of the Empire":
                    Y.attack += 3 * factor;
                    break;
                case "Champion of Y'Shaarj":
                    specialMinion.attack += 1 * factor;
                    specialMinion.health += 1 * factor;
                    break;
                case "Tormented Ritualist":
                    for (var neighbor of theirBand.neighbors(Y)) {
                        neighbor.attack += 1 * factor;
                        neighbor.health += 1 * factor;
                    }
                    break;
            }
        }
    }


}


// after X attacks Y (handles cleaves)
function afterAttack(X, Y) {

    var myBand = (X.side == 'a') ? A : B;
    var theirBand = (X.side == 'a') ? B : A;
    var factor = X.isGolden ? 2 : 1;

    switch (X.name) {
        case "Cave Hydra":
        case "Foe Reaper 4000":
            var nbs = theirBand.neighbors(Y);
            for (var i = 0; i < nbs.length; i++) {
                hit(X, nbs[i], X.attack);
            }
            break;
        case "Monstrous Macaw":
            var num = 1 * factor;
            while (num--) {
                var currNode = myBand.head;
                var targets = [];
                while (currNode != null) {
                    if (currNode.status == "alive" && (deathrattleNames.includes(currNode.name) || currNode.name == "Ghastcoiler"
                        || currNode.numPlants > 0 || currNode.numBots > 0)) {
                        targets.push(currNode);
                    }
                    currNode = currNode.next;
                }
                if (targets.length > 0) {
                    var randomDR = randomEntry(targets);
                    myBand.triggerOneDeathrattle(randomDR);
                }
            }

        // collect deaths / trigger resulting DRs because macaw may not have died but trigger a DR killing something?

    }

}

// X killed Y
function whenKill(X, Y) {

    var myBand = (X.side == 'a') ? A : B;
    var theirBand = (X.side == 'a') ? B : A;

    switch (X.name) {

    }

    whenSthKills(X, Y);

    // Check if there is a minion on board that triggers when something kills.


}

// Note: it needs to be the killing minion's turn for overkill to trigger!
// X overkilled Y
function whenOverkill(X, Y) {

    var myBand = (X.side == 'a') ? A : B;
    var theirBand = (X.side == 'a') ? B : A;
    var myFreeSpaces = 7 - myBand.length();
    var theirFreeSpaces = 7 - theirBand.length();
    var factor = X.isGolden ? 2 : 1;
    var minionsToSummon = [];

    switch (X.name) {
        case "Ironhide Direhorn":
            minionsToSummon.push(new Minion("Token", false, X.side, 5 * factor, 5 * factor, "beast", false, false, false, false, false, 0, 0));
            summon(minionsToSummon, X);
            break;
        case "Seabreaker Goliath":
            var currNode = myBand.head;
            while (currNode != null) {
                if (currNode.status == "alive" && currNode.tribe.includes("pirate") && currNode != X) {
                    currNode.attack += 2 * factor;
                    currNode.health += 2 * factor;
                }
                currNode = currNode.next;
            }
            break;
        case "Wildfire Elemental":
            var nbs = theirBand.neighbors(Y);
            if (nbs.length == 1 || (nbs.length == 2 && !X.isGolden)) { // attacked minion only has one neighbor or wildfire is non-golden -> choose 1 out of 1 or 1 out of 2
                var target = randomEntry(nbs);
                hit(X, target, -Y.health); // just overkilled Y -> deal rest to random neighbor
            } else if (nbs.slength == 2) { // and wildfire is golden -> hit both neighbors
                hit(X, nbs[0], -Y.health);
                hit(X, nbs[1], -Y.health);
            }
            break;
        case "Herald of Flame":
            var currNode = theirBand.head;
            while (currNode != null) {
                if (currNode.status == "alive" && currNode.health > 0) { // in particular, not Y because hp < 0
                    hit(X, currNode, 3 * factor);
                    if (currNode.health >= 0) break;
                }
                currNode = currNode.next;
            }
            break;

    }

    X.lastChild = X;

}
