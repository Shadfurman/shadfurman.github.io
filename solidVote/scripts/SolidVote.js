// const web3 = new Web3(Web3.givenProvider || 'http://localhost:7545');
const web3 = new Web3(Web3.givenProvider || 'https://rpc.sepolia.dev');
// const web3 = new Web3(Web3.givenProvider || 'https://eth-goerli.public.blastapi.io');

const jsonAbiFile = "../build/contracts/SolidVote.json";
const jsonContractAddressFile = "./contract-address.json";

if (web3.currentProvider) {
    console.log("Web3 provider found: ", web3.currentProvider);
} else {
    console.error("No Web3 provider found. Make sure to install MetaMask or another Web3 provider.");
}

// connect to contract
async function getAbi(jsonFile) {
    try {
        const response = await fetch(jsonFile, { headers: { 'Content-Type': 'application/json' } });
        const contractJson = await response.json();
        abi = await contractJson.abi;
        console.log("Abi found: ", abi);
        return abi;
    } catch(error) {
        console.error("Error getting ABI");
    }
}

async function getContractAddress(jsonFile) {
    try {
        const response = await fetch(jsonFile, { headers: { 'Content-Type': 'application/json' } });
        const contractJson = await response.json();
        const contractAddress = await contractJson.contractAddress;
        console.log("Contract Address found: ", contractAddress);
        return contractAddress;
    } catch(error) {
        console.error("Error getting contract address");
    }
}

let contract;
async function connectToContractOnBlockchain() {
    try {
        const abi = await getAbi(jsonAbiFile);
        const contractAddress = await getContractAddress(jsonContractAddressFile);
        contract = await new web3.eth.Contract(abi, contractAddress);
        console.log("Connected to contract on chain: ", contract);
        document.getElementById('connectEthereumWalletButton').disabled = false;
        document.getElementById('createNewBallotAppButton').disabled = false;
        document.getElementById('voteOnBallotAppButton').disabled = false;
        document.getElementById('settingsAppButton').disabled = false;
    } catch (error) {
        console.error("Failed to connect to contract:", error);
    }
}
connectToContractOnBlockchain()

//  check for Web3 browser
let web3BrowserAvailable = false;
if (typeof window.ethereum !== 'undefined') {
    console.log('Web3 compatible browser is installed');
    web3BrowserAvailable = true;
} else {
    console.log('Web3 compatible browser not found, install wallet such as MetaMask')
    web3BrowserAvailable = false;
}

// connect wallet
let account;
async function connectEthereumWallet() {
    if (web3BrowserAvailable) {
        try {
            const accounts = await web3.eth.getAccounts();
            account = accounts[0];
            if (account === undefined) { throw new Error("Account number returned undefined"); }
            console.log('Ethereum Wallet Connected, address: ', account);
            document.getElementById('connectEthereumWalletForm').style.display = 'none';
            document.getElementById('ballotFormSubmitButton').disabled = false;
            document.getElementById('submitVoteButton').disabled = false;
        } catch (error) {
            console.log("Error connected to wallet")
        }
    }
}

function createNewBallotApp() {
    document.getElementById('createBallotForm').style.display = 'block';
    document.getElementById('voteOnBallotForm').style.display = 'none';
    document.getElementById('settingsForm').style.display = 'none';
    document.getElementById('createNewBallotAppButton').disabled = true;
    document.getElementById('voteOnBallotAppButton').disabled = false;
    document.getElementById('settingsAppButton').disabled = false;
    populateBallotIDDropdownFromStorage();
}

function voteOnBallotApp() {
    document.getElementById('createBallotForm').style.display = 'none';
    document.getElementById('voteOnBallotForm').style.display = 'block';
    document.getElementById('settingsForm').style.display = 'none';
    document.getElementById('createNewBallotAppButton').disabled = false;
    document.getElementById('voteOnBallotAppButton').disabled = true;
    document.getElementById('settingsAppButton').disabled = false;
}

function settingsApp() {
    document.getElementById('createBallotForm').style.display = 'none';
    document.getElementById('voteOnBallotForm').style.display = 'none';
    document.getElementById('settingsForm').style.display = 'block';
    document.getElementById('createNewBallotAppButton').disabled = false;
    document.getElementById('voteOnBallotAppButton').disabled = false;
    document.getElementById('settingsAppButton').disabled = true;
}

async function createBallot(arrayOfCandidates, arrayOfEthereumAddresses, ballotLabel, ballotMessage, openElection) {
    console.log("Calling createBallotID function...");
    let ballotID;
    try {
        ballotID = await contract.methods.createBallotID().call();
        console.log("New ballot ID: ", ballotID);
    } catch (error) {
        console.error("Error creating ballot ID: ", error);
        return null;
    }

    const createBallotTransaction = contract.methods.createBallot(ballotID, arrayOfCandidates, arrayOfEthereumAddresses, ballotLabel, ballotMessage, openElection);
    console.log("Calling createBallot function...");
    try {
        let txResult = await createBallotTransaction.send({ from: account });
        console.log("Results from createBallot function: ", txResult);
    } catch (error) {
        console.error("Error creating ballot: ", error);
        return null;
    }
    return ballotID;
}

async function getBallot(ballotID) {
    console.log("Calling getBallot function...");
    try {
        let data = await contract.methods.getBallot(ballotID).call();
        console.log("Returned from getBallot: ", data);
        return (data);
    } catch (error) {
        console.error("Error in getBallot: ", error);
        return null;
    }
}

let nonce;
async function getNonce(ballotID) {
    console.log("Calling getNonce function...");

    try {
        nonce = await contract.methods.getNonce(ballotID).call({ from: account });
        console.log("Nonce: ", nonce);
        return (nonce);
    } catch (error) {
        console.error("Error in getNonce: ", error);
        return null;
    }
}

async function voteFor(ballotID, vote) {
    console.log("Calling voteFor function...");
    try {
        console.log("BallotID: ", ballotID);
        console.log("Vote: ", vote);
        console.log("Nonce: ", nonce);
        txResult = await contract.methods.voteFor(ballotID, vote, nonce).send({ from: account })
        console.log("Returned from voteFor: " + txResult);
        nonce++;
    } catch (error) {
        console.error("Error in voteFor: ", error);
    }
    try {
        returnedVote = await getMyVote(ballotID);
        if (returnedVote == vote) { console.log("Vote Confirmed.") }
    } catch (error) {
        console.error("Error in votedFor function: " + error);
    }
}
async function getMyVote(ballotID) {
    console.log("Calling getMyVote function...");

    try {
        const result = await contract.methods.getMyVote(ballotID).call({ from: account })
        console.log("You voted for ", result[0], result[1]);
        return result;
    } catch (error) {
        console.error("Error in getMyVote function: " + error);
    }
}
async function getVoteTotals(ballotID) {
    console.log("Calling getVoteTotals function...");

    try {
        const result = await contract.methods.getVoteTotals(ballotID).call()
        console.log("Vote totals ", result[0], result[1]);
        document.getElementById('voteTotals').style.display = "block";
        return result;
    } catch (error) {
        console.error("Error getting voteTotals: " + error);
    }
}



function commaSeperatedStringToArray(commaSeperatedString) {
    commaSeperatedString = commaSeperatedString.trim();
    let splitArray = commaSeperatedString.split(/[\r\n,]+/);
    let trimedArray = [];
    splitArray.forEach(function (arrayElement) {
        trimedArray.push(arrayElement.trim());
    });
    console.log(trimedArray);
    return trimedArray;
}

function turnCandidateArrayIntoHTML(array) {
    let resultCandidateHTML = "";
    let i = 1;
    array.forEach(function (candidateString) {
        candidateString = candidateString.trim();
        candidateString = '<input type="radio" name="ballotOptions" value="' + i + '" onclick="document.getElementById(\'selectionSubmitButton\').disabled=false">' + candidateString + '</input><br>';
        resultCandidateHTML += candidateString;
        i++
    });
    return resultCandidateHTML;
}

let ballotID;
async function submitCreateBallotForm() {
    let arrayOfEthereumAddresses = [];
    let ballotLabelText = document.getElementById('ballotLabelText').value;
    let stringOfCandidates = document.getElementById('ballotCandidatesText').value;
    let arrayOfCandidates = commaSeperatedStringToArray(stringOfCandidates);
    let ballotMessageText = document.getElementById('ballotMessageTextArea').value;
    let openElection = document.getElementById('openElectionCheckbox').checked;
    if (!openElection) {
        let stringOfEthereumAddresses = document.getElementById('voterEthereumAddressesTextArea').value;
        arrayOfEthereumAddresses = commaSeperatedStringToArray(stringOfEthereumAddresses);
    }

    try {
        ballotID = await createBallot(arrayOfCandidates, arrayOfEthereumAddresses, ballotLabelText, ballotMessageText, openElection);
    } catch (error) {
        console.error("Error in submitCreateBallotForm: ", error);
    }
    document.getElementById('existingBallotID').value = ballotID;
    console.log("BallotID returned from contract: ", ballotID);
    arrayOfBallotIDsFromStorage.push(ballotID);
    console.log("Created new BallotID: ", arrayOfBallotIDsFromStorage);
    writeBallotIDArrayToStorage();
}

function returnSelectedRadioButton() {
    let selectedRadioButtonValue;
    let selectedRadioButton = document.querySelector('input[name="ballotOptions"]:checked');
    if (selectedRadioButton != null) {
        selectedRadioButtonValue = Number(selectedRadioButton.value);
    }
    return selectedRadioButtonValue;
}

async function submitSelectedCandidate() {
    selectedCandidate = returnSelectedRadioButton();
    const setSelectionTransaction = contract.methods.setSelection(selectedCandidate);
    await setSelection(setSelectionTransaction, selectedCandidate);
    selectedInContract = await getSelection();
    if (selectedCandidate == selectedInContract) {
        await vote();
        candidateNumberVotedFor = await getVote();
        if (selectedCandidate == candidateNumberVotedFor) {
            candidateNameVotedFor = await getVoteName();
            votedForNameDisplay = document.getElementById('candidateVotedForMessage');
            votedForNameDisplay.innerHTML = '<h1>You voted for: ' + candidateNameVotedFor + '</h1>';
            document.getElementById('setSelectionForm').style.display = 'none';
            votedForNameDisplay.style.visibility = 'visible';
        }
    }
    await resetVote();
    await closeVoting();
}

function openElectionCheckboxClicked() {
    let openElectionCheckbox = document.getElementById('openElectionCheckbox');
    let voterEthereumAddresses = document.getElementById('voterEthereumAddresses');
    if (openElectionCheckbox.checked) {
        voterEthereumAddresses.style.display = "none";
    } else {
        voterEthereumAddresses.style.display = "block";
    }
}

async function getExistingBallotWithID() {
    ballotID = document.getElementById('existingBallotID').value;
    if (validBallotID(ballotID)) {
        try {
            result = await getBallot(ballotID)
            console.log(result);
            document.getElementById('ballotLabelText').value = result[0];
            document.getElementById('ballotCandidatesText').value = result[1]
            document.getElementById('ballotMessageTextArea').value = result[2];
            document.getElementById('openElectionCheckbox').checked = result[3];
            openElectionCheckboxClicked();
        } catch (error) {
            console.error("Error in getExistingBallotWithID: ", error);
        }
    }
}

async function getBallotForVote() {
    ballotID = document.getElementById('ballotIDforVote').value;
    if (validBallotID(ballotID)) {
        try {
            result = await getBallot(ballotID)
            document.getElementById('ballotLabelLabel').innerText = result[0];
            document.getElementById('listOfCandidatesForVote').innerHTML = createRadioListOfCandidates(result[1]);
            document.getElementById('ballotMessageLabel').innerText = result[2];
            document.getElementById('submitVoteButton').style.display = 'block';
            if (result[3]) {
                console.log("Open Election");
            } else {
                console.log("Closed Election");
            }
        } catch (error) {
            console.error("Error in getBallotForVote: ", error);
        }

        try {
            nonce = await getNonce(ballotID)
        } catch (error) {
            console.error("Error getting nonce: ", error);
        }
    } else {
        console.log("Invalid BallotID");
    }
}

async function submitVote() {
    let voteSelectionId = document.querySelector('input[name="listOfBallotCandidates"]:checked').id;
    console.log("ID of vote: " + voteSelectionId);
    try {
        await voteFor(ballotID, voteSelectionId);
        await totalVotes();
    } catch (error) {
        console.error("Error in submitVote: ", error);
    }
}

async function totalVotes() {
    let candidateNames;
    let voteTotals;
    try {
        const result = await getVoteTotals(ballotID)
        console.log("totalVotes: ", result);
        candidateNames = result[0];
        voteTotals = result[1];
    } catch (error) {
        console.error("Error in totalVotes: ", error);
    }

    let voteResults = candidateNames.map((item, index) => {
        return { candidate: item, votes: voteTotals[index] };
    });
    voteResults.sort((a, b) => a.votes - b.votes);
    const numberOfCandidates = document.querySelectorAll('#voteOnBallotForm input[type="radio"]').length;

    let table = document.createElement('table');

    let thead = document.createElement('thead');
    let headerRow = document.createElement('tr');
    let th1 = document.createElement('th');
    th1.textContent = "Candidates";
    let th2 = document.createElement('th');
    th2.textContent = "Votes";
    headerRow.appendChild(th1);
    headerRow.appendChild(th2);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    let tbody = document.createElement('tbody');
    for (let i = 0; i < numberOfCandidates; i++) {
        let row = document.createElement('tr');
        let td1 = document.createElement('td');
        td1.textContent = voteResults[i].candidate;
        let td2 = document.createElement('td');
        td2.textContent = voteResults[i].votes;
        row.appendChild(td1);
        row.appendChild(td2);
        tbody.appendChild(row);
    }
    table.appendChild(tbody);

    let voteTotalsBox = document.getElementById('voteTotals');
    voteTotalsBox.appendChild(table);
}

let arrayOfBallotIDsFromStorage = [];
function populateBallotIDDropdownFromStorage() {
    let ballotIDFromStorage;
    let ballotsInStorage = document.getElementById('ballotsInStorage');
    for (let i = 0; i < localStorage.length; i++) {
        ballotIDFromStorage = localStorage.key(i);
        ballotIDOptionHTML = createOptionHTML(ballotIDFromStorage);
        if (validBallotID(ballotIDFromStorage)) {
            ballotsInStorage.insertAdjacentHTML('beforeend', ballotIDOptionHTML);
            arrayOfBallotIDsFromStorage.push(ballotIDFromStorage);
        }
        console.log(i, ballotIDFromStorage);
    }
    console.log(localStorage);
}

function writeBallotIDArrayToStorage() {
    localStorage.clear();
    for (let i = 0; i < arrayOfBallotIDsFromStorage.length; i++) {
        element = arrayOfBallotIDsFromStorage.pop();
        localStorage.setItem(element, element);
    }
    console.log("All BallotIDs have been written to localStorage.\n", arrayOfBallotIDsFromStorage);
}

function createOptionHTML(optionValue) {
    optionHTML = "<option value='" + optionValue + "'>";
    return optionHTML;
}

function createRadioListOfCandidates(candidates) {
    let numberOfCandidates = candidates.length;
    let returnHTML = "";
    let radioName = "listOfBallotCandidates"
    for (let i = 0; i < numberOfCandidates; i++) {
        returnHTML += "<input type='radio' id='" + i + "' name='" + radioName + "'/>";
        returnHTML += "<label for='" + i + "'>" + candidates[i] + "</label><br>";
    }
    return returnHTML;
}

function clickDeleteAllStorageYesButton() {
    console.log("All ballots in localStorage have been deleted!");
    localStorage.clear();
    arrayOfBallotIDsFromStorage = [];
    console.log("Ballots in localStorage: ", localStorage.length);
    document.getElementById("confirmDeleteAllStorage").style = "display:none";
}

function clickDeleteAllStorageNoButton() {
    console.log("No ballots deleted.");
    document.getElementById("confirmDeleteAllStorage").style = "display:none";
}

function deleteAllStorage() {
    document.getElementById("confirmDeleteAllStorage").style = "display:block";
}

function clickDeleteBallotFromStorageYesButton() {

}

function clickDeleteBallotFromStorageNoButton() {

}

function deleteSelectedBallot() {
    ballotID = document.getElementById('existingBallotID').value;
    returnedFromSearch = arrayOfBallotIDsFromStorage.indexOf(ballotID);
    if (returnedFromSearch !== -1) {
        arrayOfBallotIDsFromStorage = arrayOfBallotIDsFromStorage.splice(returnedFromSearch, 1);
        writeBallotIDArrayToStorage();
        console.log("Deleted BallotID: ", ballotID);
    } else {
        console.log("BallotID, " + ballotID + ", not found.");
    }
}

function validBallotID(ballotID) {
    if (ballotID != null) {
        return ballotID.length == 66;
    } else {
        return false;
    }
}

function autoResizeTextArea(element) {
    element.style.height = "10px";
    element.style.height = element.scrollHeight + "px";
    console.log(element.style.height);
}

function ethereumAddressesTextAreaOnPaste(element, event) {
    event.stopPropagation();
    event.preventDefault();
    clip = event.clipboardData;
    let pastedText = clip.getData('text/plain');
    pastedText = element.value + pastedText;

    let formatedString = formatEthereumAddressesTextArea(pastedText);

    element.value = formatedString;
    autoResizeTextArea(element);
}

function ethereumAddressesTextAreaOnBlur(element) {
    let textString = element.value;

    let formatedString = formatEthereumAddressesTextArea(textString);

    element.value = formatedString;
    autoResizeTextArea(element);
}

function formatEthereumAddressesTextArea(textString) {
    let addressArray = textString.match(/0x[a-fA-F0-9]{40}/g);
    addressArray = [...new Set(addressArray)];      // remove duplicates
    let formatedString = "";
    if (addressArray === null) {
        console.log("No addresses found.");
    } else {
        console.log("extracted addresses", addressArray);
        formatedString = formatOneAddressPerLine(addressArray);
    }

    return formatedString;
}

function formatOneAddressPerLine(addresses) {
    let formatedString = [];
    for (let i = 0; i < addresses.length; i++) {
        if (web3.utils.isAddress(addresses[i])) {
            formatedString += addresses[i] + "\n";
            console.log((i + 1) + ". " + addresses[i] + " is a valid address");
        } else {
            console.error((i + 1) + ". " + addresses[i] + " is NOT valid address.");
        }
    }
    return formatedString;
}