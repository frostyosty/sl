// fetch and display transactions in the table
// show transaction table on page load
async function fetchTransactions(selectedItem = '') {
    const transactionTableContainer = document.querySelector("#transaction-table");
    const tableBody = document.querySelector("#transaction-table tbody");
    const spinner = document.createElement("div"); // create spinner dynamically
    spinner.classList.add("csf-spinner");
    spinner.innerHTML = `
        <div class="csf-letter">C</div>
        <div class="csf-letter">I</div>
        <div class="csf-letter">B</div>
    `;
    spinner.style.top = "-10%";
    spinner.style.left = "50%";
    // spinner.style.transform = "translate(-50%, -50%)";
    spinner.style.marginTop = "2px"; 
    spinner.style.zIndex = "100";
    spinner.style.setProperty('color', 'black', 'important');
    // clear previous table content and show spinner
    tableBody.innerHTML = '';
    transactionTableContainer.appendChild(spinner);

    try {
        const url = `/api/transactions?type=transactions${selectedItem ? `?item=${encodeURIComponent(selectedItem)}` : ''}`;
        console.log("Fetching from URL:", url);

        const response = await fetch(url);
        console.log("Response status:", response.status);

        if (!response.ok) {
            console.error("Response not OK:", response.statusText);
            return;
        }

        const transactions = await response.json();
        console.log("Fetched transactions:", transactions);

        const tbody = document.getElementById('transaction-table-body');
        console.log("Clearing and populating table body...");
        tbody.innerHTML = '';
        transactions.forEach(transaction => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${transaction.items_given.join(', ')}</td>
                <td>${transaction.items_received.join(', ')}</td>
                <td>${formatDate(transaction.trade_date)}</td>
                <td>${transaction.location}</td>
            `;
            
            tbody.appendChild(row);

        });


       
            console.log("Transactions table updated successfully.");
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            spinner.remove();
        }
    mergeTransactionTableCells('transaction-table-body', 2);
    mergeTransactionTableCells('transaction-table-body', 3);    
}        
    


document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded event fired.");
    
    fetchTransactions();
});













// TRANSACTION FORM SUBMISSION

// form validation etc
// ADD ITEM Dynamically add new input fields/to the specified list
function addItem(listId) {
    const list = document.getElementById(listId);

    // container for the input and buttons
    const itemEntry = document.createElement('div');
    itemEntry.className = 'item-entry';
    itemEntry.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
    itemEntry.style.opacity = '0';
    itemEntry.style.transform = 'translateY(-10px)';
    //the input fields
    const input = document.createElement('input');
    input.type = 'text';
    input.name = listId === 'items-given-list' ? 'items-given[]' : 'items-received[]';
    input.placeholder = listId === 'items-given-list' ? 'Item Given' : 'Item Received';
    input.required = true;
    input.className = 'transaction-item-input';

    //the Remove button
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'button-style-3-purple-v2 remove-transaction-item-button';
    removeButton.textContent = 'Remove';
    removeButton.onclick = () => removeItem(itemEntry);

    itemEntry.appendChild(input);
    itemEntry.appendChild(removeButton);

    list.appendChild(itemEntry);

    requestAnimationFrame(() => {
        itemEntry.style.opacity = '1';
        itemEntry.style.transform = 'translateY(0)';
    });
}
// remove an item smooth animation
function removeItem(itemEntry) {
    itemEntry.style.opacity = '0';
    itemEntry.style.transform = 'translateY(-10px)';
    setTimeout(() => itemEntry.remove(), 300);
}
// hide add buttons initially and manage visibility dynamically
document.querySelectorAll('.transactions-submit-row').forEach(row => {
    const input = row.querySelector('.item-entry input');
    const addButton = row.querySelector('.add-transaction-item-given-button') || row.querySelector('.add-transaction-item-received-button');
    // hide the Add button
    if (addButton) addButton.style.display = 'none';
    // showwhen typing starts
    if (input) {
        input.addEventListener('input', () => {
            addButton.style.display = input.value.trim() ? 'inline-block' : 'none';
        });
    }
});















// date selection logic
document.querySelectorAll('input[name="trade-date-option"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const tradeDateInput = document.getElementById('trade-date');
        const selectedValue = e.target.value;

        if (selectedValue === 'today') {
            tradeDateInput.value = new Date().toISOString().split('T')[0];
            tradeDateInput.style.display = 'none';
        } else if (selectedValue === 'yesterday') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            tradeDateInput.value = yesterday.toISOString().split('T')[0];
            tradeDateInput.style.display = 'none';
        } else {
            tradeDateInput.style.display = 'block';
            tradeDateInput.value = ''; // clear value for custom input
        }
    });
});






// form submission
document.getElementById('transaction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!canSubmitTransactionTimerCheck()) return;
    if (!canSubmitTransaction()) return;
    // form data collect
    const itemsGiven = Array.from(document.querySelectorAll('input[name="items-given[]"]')).map(input => input.value.trim()).filter(val => val);
    const itemsReceived = Array.from(document.querySelectorAll('input[name="items-received[]"]')).map(input => input.value.trim()).filter(val => val);
    const tradeDateOption = document.querySelector('input[name="trade-date-option"]:checked')?.value || 'custom';
    const tradeDate = (() => {
        if (tradeDateOption === 'today') {
            return new Date().toISOString().split('T')[0];
        } else if (tradeDateOption === 'yesterday') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday.toISOString().split('T')[0];
        } else {
            return document.getElementById('trade-date').value.trim();
        }
    })();
    const locationOfTransaction = document.getElementById('location').value.trim();
    if (!itemsGiven.length || !itemsReceived.length || !tradeDate || !locationOfTransaction) {
        alert('Please ensure all required fields are filled out.');
        return;
    }
    const transaction = { 
        itemsGivenSubmission: itemsGiven, 
        itemsReceivedSubmission: itemsReceived, 
        tradeDateSubmission: tradeDate, 
        locationSubmission: locationOfTransaction 
    };
    // optimistic update
    const tbody = document.getElementById('transaction-table-body');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${transaction.itemsGivenSubmission.join(', ')}</td>
        <td>${transaction.itemsReceivedSubmission.join(', ')}</td>
        <td>${transaction.tradeDateSubmission}</td>
        <td>${transaction.locationSubmission}</td>
    `;
    tbody.prepend(newRow);

    console.log('Transaction payload:', transaction);
    // transaction to server
    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        });
        const result = await response.json();
        if (!response.ok) {
            console.error('Server error:', result.message);
            showTransactionAddedMessage(result.message || 'Failed to submit transaction.', 'red');
            newRow.remove();
        } else {
            showTransactionAddedMessage('Submission successful!', 'green');
            document.getElementById('transaction-form').reset();
        }
    } catch (error) {
        console.error('Error submitting transaction:', error);
        alert('Error occurred while submitting the transaction.');
        newRow.remove();
    }
});


function showTransactionAddedMessage(text, color) {
    const message = document.createElement("p");
    message.textContent = text;
    message.style.color = color;
    message.classList.add("message");
    
    // add the message to the container
    const messageContainer = document.getElementById("transaction-message-container");
    messageContainer.appendChild(message);

    setTimeout(() => {
        message.classList.add("fade-out");
    }, 3500);

    // remove the message element after fade-out completes (total 6 seconds here)
    setTimeout(() => {
        message.remove();
    }, 5000);
}


// validate fields function
function canSubmitTransaction() {
    const itemsGiven = document.querySelectorAll('input[name="items-given[]"]');
    const itemsReceived = document.querySelectorAll('input[name="items-received[]"]');
    const tradeDateOption = document.querySelector('input[name="trade-date-option"]:checked');
    const tradeDate = document.getElementById('trade-date');
    const location = document.getElementById('location');

    if (Array.from(itemsGiven).some(input => !input.value.trim())) {
        alert("Please fill in all 'Items Given' fields.");
        return false;
    }
    if (Array.from(itemsReceived).some(input => !input.value.trim())) {
        alert("Please fill in all 'Items Received' fields.");
        return false;
    }
    if (tradeDateOption.value === 'custom' && !tradeDate.value.trim()) {
        alert("Please select a custom trade date.");
        return false;
    }
    if (!location.value.trim()) {
        alert("Please fill in the location field.");
        return false;
    }
    return true;
}

let lastTransactionSubmissionTime = 0;

function canSubmitTransactionTimerCheck() {
    const now = Date.now();
    const timeDifference = now - lastTransactionSubmissionTime;

    if (timeDifference < 10000) {
        alert(`Please wait ${(10 - timeDifference / 1000).toFixed(1)} seconds before submitting another transaction.`);
        return false;
    }

    lastTransactionSubmissionTime = now;
    return true;
}














// location grab for transactions - fancy
async function fetchTransactionLocation() {
    try {
        const response = await fetch(`https://ipinfo.io/json?token=96aa35404e2849`);
        const data = await response.json();
        const locationInput = document.getElementById("location"); // Update to transaction location field

        if (locationInput) {
            locationInput.value = data.city || "Unknown";
            locationInput.addEventListener("click", () => {
                locationInput.value = locationInput.value === data.city ? "Global" : data.city || "Unknown";
            });
        } else {
            console.error("Location input not found.");
        }
    } catch (error) {
        console.error("Failed to fetch location:", error);
    }
}
fetchTransactionLocation();

// tab-select functionality to location input
document.getElementById("location").addEventListener("keydown", (event) => {
    if (event.key === "Tab" && document.activeElement === event.target) {
        event.preventDefault(); // Prevent jumping to the next field
        event.target.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })); // i.e. suggestion
    }
});














// FILTER STUFF

// event listeners to the transaction table
document.getElementById('transaction-table-body').addEventListener('click', (event) => {
    const cell = event.target;
    const column = cell.cellIndex;
      if (column === 0 || column === 1) { // Items given or received columns
        const items = cell.innerText.split(',').map(item => item.trim());
        // exact position of the click within the cell
        const clickX = event.clientX - cell.getBoundingClientRect().left;
        // text width for each item and determine clicked item
        let cumulativeWidth = 0;
        const clickedItem = items.find(item => {
            const tempSpan = document.createElement('span');
            tempSpan.style.visibility = 'hidden';
            tempSpan.style.position = 'absolute';
            tempSpan.textContent = item + ", ";
            document.body.appendChild(tempSpan);
            const itemWidth = tempSpan.getBoundingClientRect().width;
            cumulativeWidth += itemWidth;
            document.body.removeChild(tempSpan);
            return clickX <= cumulativeWidth;
        });

        if (clickedItem) {
            document.getElementById('filter-item').value = clickedItem; // Set the clicked item in the filter
            updateFilters();
        } else {
            console.error("No item detected at clicked position.");
        }
    } else if (column === 3) { 
        const location = cell.innerText.trim();
        const filterLocationToggle = document.getElementById('filter-location-toggle');
        if (location !== "Global") {
            filterLocationToggle.checked = false;
            document.getElementById('local-location').value = location;
        } else {
            filterLocationToggle.checked = true;
            document.getElementById('local-location').value = "";
        }
        toggleLocationDisplay();
        updateFilters();
    }
    // updateFilters(); // these "updateFilters();" --> possibly done per below when change is detected TODO confirm
});


// Also update filters on any of the below
document.querySelectorAll('input[name="time-range"]').forEach(radio => {
    radio.addEventListener('change', () => updateFilters());
});

let debounceTimerForTransactionsItemFilter;
document.getElementById('filter-item').addEventListener('input', (event) => {
    clearTimeout(debounceTimerForTransactionsItemFilter);
    debounceTimerForTransactionsItemFilter = setTimeout(() => {
        updateFilters();
    }, 300);
});

document.getElementById('local-location').addEventListener('input', () => {
    const inputValue = document.getElementById('local-location').value;
    if (!inputValue.match(/^[a-zA-Z\s]*$/)) {
        console.error('Invalid location input:', inputValue);
        return;
    }
    updateFilters();
});

document.getElementById('filter-location-toggle').addEventListener('change', () => {
    console.log("filter location clicked 1");
    const globalTickBoxUpdateOnInput = document.getElementById('filter-location-toggle').checked;
    const locationUpdateOnInput = document.getElementById('local-location');
    if (globalTickBoxUpdateOnInput) locationUpdateOnInput.value = '';
    updateFilters();
});

async function updateFilters() {
    try {
        const item = document.getElementById('filter-item').value || null;
        const timeRange = document.querySelector('input[name="time-range"]:checked')?.value || "all";
        const locationToggle = document.getElementById('filter-location-toggle').checked;
        const location = locationToggle ? "Global" : document.getElementById('local-location').value || "";

        console.log("Filter details:", { item, timeRange, location });

        const queryParams = new URLSearchParams();
        if (item) queryParams.append('item', item);
        queryParams.append('timeRange', timeRange);
        queryParams.append('location', location);

        const transactionTable = document.querySelector("#transaction-table");
        const tbody = document.getElementById("transaction-table-body");
        const spinner = document.createElement("div");

        spinner.classList.add("csf-spinner");
        spinner.innerHTML = `
            <div class="csf-letter">C</div>
            <div class="csf-letter">I</div>
            <div class="csf-letter">B</div>
        `;
        spinner.style.position = "absolute";
        spinner.style.top = "50%";
        spinner.style.left = "50%";
        spinner.style.transform = "translate(-50%, -50%)";
        spinner.style.zIndex = "10000";
        spinner.style.setProperty('color', 'black', 'important');
        spinner.style.setProperty('opacity', '1', 'important');
        tbody.style.position = "relative";
        tbody.appendChild(spinner);

        // grey out the table
        transactionTable.style.opacity = "0.5";
        transactionTable.style.pointerEvents = "none"; // disable interactionsfor now (until finally block)

        const response = await fetch(`/api/transactions?type=transactions-with-filters&${queryParams.toString()}`);
        if (!response.ok) throw new Error(`Fetch failed with status: ${response.status}`);

        const transactions = await response.json();
        console.log("Transactions fetched:", transactions);

        const hasTransactions = transactions.length > 0;

        tbody.innerHTML = hasTransactions
            ? transactions.map(tx => `
                <tr>
                    <td>${tx.items_given.join(", ")}</td>
                    <td>${tx.items_received.join(", ")}</td>
                    <td>${tx.trade_date ? formatDate(tx.trade_date) : "N/A"}</td>
                    <td>${tx.location}</td>
                </tr>
            `).join("")
            : "<tr><td colspan='4'>No transactions found for this filter.</td></tr>";

        document.querySelectorAll("#transaction-table th:nth-child(3), #transaction-table td:nth-child(3)")
            .forEach(cell => cell.style.display = "table-cell");

            mergeTransactionTableCells('transaction-table-body', 2);
            mergeTransactionTableCells('transaction-table-body', 3);

        // stats calculation
        const totalTransactions = transactions.length;
        console.log('Total transactions:', totalTransactions);
        const totalItemsGiven = transactions.reduce((sum, tx) => sum + tx.items_given.length, 0);
        console.log('Total items given:', totalItemsGiven);
        const itemOccurrences = item ? transactions.filter(tx =>
            tx.items_given.includes(item) || tx.items_received.includes(item)).length : 0;
        console.log(`Item occurrences for "${item}":`, itemOccurrences);

        const uniqueIPs = new Set(transactions.map(tx => tx.ip_address));
        console.log('Unique IPs (count):', uniqueIPs.size);
        const desirability = totalTransactions > 0 ? (totalItemsGiven / totalTransactions).toFixed(2) : 0;
        if (totalTransactions > 0) {
            console.log(`Desirability = Total Items Given (${totalItemsGiven}) / Total Transactions (${totalTransactions}) = ${desirability}`);
        } else {
            console.log('Desirability = 0 (No transactions)');
        }
        const rarity = totalTransactions > 0 && item ? (itemOccurrences / totalTransactions).toFixed(2) : 0;
        if (totalTransactions > 0 && item) {
            console.log(`Rarity = Item Occurrences (${itemOccurrences}) / Total Transactions (${totalTransactions}) = ${rarity}`);
        } else if (!item) {
            console.log('Rarity = 0 (No item specified)');
        } else {
            console.log('Rarity = 0 (No transactions)');
        }
        const diversity = itemOccurrences > 0 ? (uniqueIPs.size / itemOccurrences).toFixed(2) : 0;
        if (itemOccurrences > 0) {
            console.log(`Diversity = Unique IPs (${uniqueIPs.size}) / Item Occurrences (${itemOccurrences}) = ${diversity}`);
        } else {
            console.log('Diversity = 0 (No item occurrences)');
        }
        document.getElementById('stats-desirability').innerText = desirability;
        document.getElementById('stats-rarity').innerText = rarity;
        document.getElementById('stats-diversity').innerText = diversity;
        const statsSection = document.getElementById('stats-section');
        const statsItems = statsSection.querySelectorAll('.stats-item');
        statsSection.style.display = 'flex';
        statsItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.8)';
            setTimeout(() => {
                item.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                item.style.opacity = '1';
                item.style.transform = 'scale(1)';
            }, index * 200);
        });




    } catch (error) {
        console.error('Error fetching transactions:', error);
    } finally {
        // restore table interaction and remove spinner
        const transactionTable = document.querySelector("#transaction-table");
        transactionTable.style.opacity = "1";
        transactionTable.style.pointerEvents = "auto";
        const spinner = document.querySelector(".csf-spinner");
        if (spinner) spinner.remove();
    }
}



// format date
function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) {
        console.warn(`Invalid date string: ${dateString}`);
        return dateString; //raw input if parsing fails
    }

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
    });
}





// populate item filter dropdown
async function populateItemFilter() {
    try {
        const response = await fetch('/api/transactions?type=unique-items');
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const items = await response.json();
        const itemList = document.getElementById('item-list');

        if (!itemList) throw new Error('Datalist element not found');

        itemList.innerHTML = ''; // clear current items

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            itemList.appendChild(option);
        });
    } catch (error) {
        console.error("Error fetching unique items:", error);
    }
}

populateItemFilter();


// allow typing in the drop down box
document.getElementById('filter-item').addEventListener('input', async (e) => {
    const query = e.target.value.toLowerCase();
    
    if (!query) return; // no input --> return

    const suggestions = await fetch(`/api/transactions?type=unique-items-fuzzy&searchQuery=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .catch(error => console.error('Error fetching suggestions:', error));

    console.log('Suggestions:', suggestions);

    if (Array.isArray(suggestions)) {
        const matched = suggestions.filter(item => item.toLowerCase().includes(query));
        if (matched.length === 0) {
            console.warn('Item not found');
        } else {

        }
    } else {
        console.error('The suggestions are not an array:', suggestions);
    }
});






// filter location

// show/hide (but not just on click as it can be called from other function)
function toggleLocationDisplay() {
    const localInput = document.getElementById('local-location');
    const filterLocationToggle = document.getElementById('filter-location-toggle');
    if (filterLocationToggle.checked) {
        localInput.style.display = 'none'; // hide for global
    } else {
        localInput.style.display = 'block';
    }
}
document.getElementById('filter-location-toggle').addEventListener('change', toggleLocationDisplay);


// get location from toggle/input
const locationOfTransaction = document.getElementById('filter-location-toggle').checked
    ? 'Global'
    : document.getElementById('local-location').value || 'Unknown';





    // UTILITY
// prevent form submission on enter and trigger updateFilters instead
document.getElementById('transaction-filters-form').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        updateFilters();
    }
});

// merge cells in table - approach 1
function mergeTransactionTableCells(tableBodyId, columnIndex) {
    const tbody = document.getElementById(tableBodyId);
    let lastCell = null;
    let rowSpan = 1;
    Array.from(tbody.rows).forEach(row => {
        const cell = row.cells[columnIndex];
        if (!cell) return; // skip if cell is undefined
        if (lastCell && cell.textContent.trim() === lastCell.textContent.trim()) {
            rowSpan++;
            lastCell.rowSpan = rowSpan;
            cell.style.display = "none";
        } else {
            rowSpan = 1;
            lastCell = cell;
        }
    });
    Array.from(tbody.rows).forEach(row => {
        for (let i = columnIndex + 1; i < row.cells.length; i++) {
            if (row.cells[i].style.display === "none") {
                row.deleteCell(i);
            }
        }
    });
}

// // merge cells in table - approach 2
// function mergeTransactionTableCells(tableBodyId, columnIndex) {
//     const tbody = document.getElementById(tableBodyId);
//     const rows = Array.from(tbody.rows);

//     if (rows.length === 0) return;

//     let mergeInfo = [];
//     let lastText = null;
//     let lastRowIndex = -1;
//     let rowSpan = 0;

//     rows.forEach((row, rowIndex) => {
//         const cell = row.cells[columnIndex];
//         if (!cell) return;
//         const cellText = cell.textContent.trim();
//         if (cellText === lastText) {
//             rowSpan++;
//         } else {
//             // save other merges' info
//             if (lastRowIndex >= 0) {
//                 mergeInfo.push({ rowIndex: lastRowIndex, rowSpan });
//             }
//             // reset tracking
//             lastText = cellText;
//             lastRowIndex = rowIndex;
//             rowSpan = 1;
//         }
//     });
//     // save final group
//     if (lastRowIndex >= 0) {
//         mergeInfo.push({ rowIndex: lastRowIndex, rowSpan });
//     }
//     // do all merges in separate iteration
//     mergeInfo.forEach(({ rowIndex, rowSpan }) => {
//         const cell = rows[rowIndex].cells[columnIndex];
//         cell.rowSpan = rowSpan;
//         for (let i = 1; i < rowSpan; i++) {
//             rows[rowIndex + i].cells[columnIndex].style.display = "none";
//         }
//     });
// }





    // below NOT USED -- currently not necessary as there is no submit button for filters
document.getElementById('transaction-filters-form').addEventListener('submit', async function (e) {
    e.preventDefault(); // prevent page reload
    // get filter values
    const item = document.getElementById('filter-item').value;
    const timeRange = document.querySelector('input[name="time-range"]:checked').value;
    const locationToggle = document.getElementById('filter-location-toggle').checked;
    const location = locationToggle ? 'Global' : document.getElementById('local-location').value;

    try {
        const response = await fetch(`/api/transactions?type=transactions-with-filters&item=${encodeURIComponent(item)}&timeRange=${encodeURIComponent(timeRange)}&location=${encodeURIComponent(location)}`);
        const transactions = await response.json();

        if (!response.ok) throw new Error(transactions.message);

        const tbody = document.getElementById('transaction-table-body'); 
        tbody.innerHTML = ''; // clear existing rows
        transactions.forEach(tx => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tx.items_given.join(', ')}</td>
                <td>${tx.items_received.join(', ')}</td>
                <td>${new Date(tx.trade_date).toLocaleDateString()}</td>
                <td>${tx.location}</td>
            `;
            tbody.appendChild(row);
        });
        const totalTransactions = transactions.length;
        const totalItemsGiven = transactions.reduce((sum, tx) => sum + tx.items_given.length, 0);
        const itemOccurrences = transactions.filter(tx =>
            tx.items_given.includes(item) || tx.items_received.includes(item)).length;

        const uniqueIPs = new Set(transactions.map(tx => tx.ip_address));

        const desirability = totalTransactions > 0 ? (totalItemsGiven / totalTransactions).toFixed(2) : 0;
        const rarity = totalTransactions > 0 ? (itemOccurrences / totalTransactions).toFixed(2) : 0;
        const diversity = itemOccurrences > 0 ? (uniqueIPs.size / itemOccurrences).toFixed(2) : 0;

        document.getElementById('stats-desirability').innerText = desirability;
        document.getElementById('stats-rarity').innerText = rarity;
        document.getElementById('stats-diversity').innerText = diversity;
        document.getElementById('stats-section').style.display = 'block';
    } catch (error) {
        console.error('Error fetching transactions:', error);
    }
});