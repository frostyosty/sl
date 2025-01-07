async function fetchEntries(item = '', timeRange = '', location = '') {
    const recentEntriesContainer = document.querySelector("#entry-table-container");
    const tableBody = document.querySelector("#entry-table-body");

    if (!tableBody) {
        console.error("Table body not found. Check the HTML structure and ensure the script runs after the table is loaded.");
        return;
    }

    const spinner = document.createElement("div");
    spinner.classList.add("entry-spinner");
    spinner.innerHTML = `
        <div class="spinner-letter">L</div>
        <div class="spinner-letter">O</div>
        <div class="spinner-letter">A</div>
        <div class="spinner-letter">D</div>
    `;
    spinner.style.position = "relative";
    spinner.style.marginTop = "2px";

    tableBody.innerHTML = '';
    recentEntriesContainer.appendChild(spinner);

    try {
        const params = new URLSearchParams();
        if (item) params.append('item', item);
        if (timeRange) params.append('timeRange', timeRange);
        if (location) params.append('location', location);

        const url = `/api/entries?type=fetchEntries&${params.toString()}`;
        console.log("Fetching entries from URL:", url);

        const response = await fetch(url);
        const text = await response.text();
        
        if (!response.ok) {
            console.error("Error fetching entries:", text);
            throw new Error(`Error: ${text}`);
        }

        let entries;
        try {
            entries = JSON.parse(text);
        } catch (e) {
            console.error("Response is not valid JSON:", text);
            throw new Error("Invalid JSON response");
        }

        console.log("Fetched entries:", entries);

        entries.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.name || '-'}</td>
                <td>${entry.description || '-'}</td>
                <td>${entry.approx_date || '-'}</td>
                <td>${entry.approx_age || '-'}</td>
                <td>${entry.ethnicity || '-'}</td>
                <td>Picture Placeholder</td>
                <td>${new Date(entry.created_at).toLocaleDateString() || '-'}</td>
            `;
            tableBody.appendChild(row);
        });
        console.log("Recent entries table updated.");
    } catch (error) {
        console.error("Error fetching entries:", error);
    } finally {
        spinner.remove();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    fetchEntries(); // Fetch all entries initially
});



// submit content
document.addEventListener("DOMContentLoaded", () => {
    // Handle form submission
    const entryForm = document.getElementById('entry-form');
    if (entryForm) {
        entryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            const description = document.getElementById('description').value.trim();
            const approxDate = document.getElementById('approx-date').value.trim();
            const approxAge = document.querySelector('input[name="approx-age"]:checked')?.value || '-';
            const ethnicity = document.getElementById('ethnicity').value.trim();

            if (!name || !approxDate) {
                alert("Name and approximate date are required.");
                return;
            }

            const entry = {
                nameSubmission: name,
                descriptionSubmission: description || '-',
                approxDateSubmission: approxDate,
                approxAgeSubmission: approxAge,
                ethnicitySubmission: ethnicity || '-',
                pictureSubmission: null, // placeholder if picture isn't implemented
                createdAtSubmission: new Date().toISOString(),
                ipSubmission: '...' // placeholder for IP handling if required
            };

            const tableBody = document.getElementById("entry-table-body");
            if (!tableBody) {
                console.error("Table body not found! Check your HTML structure.");
                return;
            }

            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${entry.nameSubmission}</td>
                <td>${entry.descriptionSubmission}</td>
                <td>${entry.approxDateSubmission}</td>
                <td>${entry.approxAgeSubmission}</td>
                <td>${entry.ethnicitySubmission}</td>
                <td>Picture Placeholder</td>
                <td>${new Date(entry.createdAtSubmission).toLocaleDateString()}</td>
            `;
            tableBody.prepend(newRow);

            console.log("Entry payload:", entry);

            try {
                const response = await fetch('/api/entries', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(entry),
                });
                if (!response.ok) throw new Error(`Error: ${response.statusText}`);

                console.log("Entry submitted successfully.");
                entryForm.reset();
                document.getElementById('approx-date').value = new Date().toISOString().split('T')[0]; // Reset date to today
            } catch (error) {
                console.error("Error submitting entry:", error);
                newRow.remove();
            }
        });
    }

    // Handle Today button
    const todayButton = document.querySelector('button[onclick="setToday()"]');
    if (todayButton) {
        todayButton.addEventListener('click', () => {
            const dateInput = document.getElementById('approx-date');
            dateInput.value = new Date().toISOString().split('T')[0];
        });
    }

    // Handle Yesterday button
    const yesterdayButton = document.querySelector('button[onclick="setYesterday()"]');
    if (yesterdayButton) {
        yesterdayButton.addEventListener('click', () => {
            const dateInput = document.getElementById('approx-date');
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            dateInput.value = yesterday.toISOString().split('T')[0];
        });
    }

    // Set default date to today
    const dateInput = document.getElementById('approx-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
});




















// filter stuff

// event listeners to the entry table
document.getElementById('entry-table-body').addEventListener('click', (event) => {
    const cell = event.target;
    const column = cell.cellIndex;

    if (column === 0 || column === 1) { // items given or received columns
        const items = cell.innerText.split(',').map(item => item.trim());
        const clickX = event.clientX - cell.getBoundingClientRect().left; // click position in cell
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
            document.getElementById('filter-item').value = clickedItem; // set clicked item in filter
            updateFilters();
        } else {
            console.error("no item detected at clicked position.");
        }
    } else if (column === 3) { // location column
        const location = cell.innerText.trim();
        const filterLocationToggle = document.getElementById('filter-location-toggle');
        if (location !== "global") {
            filterLocationToggle.checked = false;
            document.getElementById('local-location').value = location;
        } else {
            filterLocationToggle.checked = true;
            document.getElementById('local-location').value = "";
        }
        toggleLocationDisplay();
        updateFilters();
    }
});

// update filters on any change
document.querySelectorAll('input[name="time-range"]').forEach(radio => {
    radio.addEventListener('change', () => updateFilters());
});

let debounceTimerForEntriesItemFilter;
document.getElementById('filter-item').addEventListener('input', () => {
    clearTimeout(debounceTimerForEntriesItemFilter);
    debounceTimerForEntriesItemFilter = setTimeout(() => updateFilters(), 300);
});

document.getElementById('local-location').addEventListener('input', () => {
    const inputValue = document.getElementById('local-location').value;
    if (!inputValue.match(/^[a-zA-Z\s]*$/)) {
        console.error('invalid location input:', inputValue);
        return;
    }
    updateFilters();
});

document.getElementById('filter-location-toggle').addEventListener('change', () => {
    const globalTickBox = document.getElementById('filter-location-toggle').checked;
    const locationInput = document.getElementById('local-location');
    if (globalTickBox) locationInput.value = '';
    updateFilters();
});

async function updateFilters() {
    try {
        const form = document.getElementById('entry-filters-form');
        const timeRange = form.querySelector('input[name="time-range"]:checked')?.value || "all";
        const locationToggle = form.querySelector('#filter-location-toggle').checked;
        const location = locationToggle ? "global" : form.querySelector('#local-location')?.value || "";
        const item = form.querySelector('#filter-item').value || null;

        console.log("Filter details:", { timeRange, location, item });

        const queryParams = new URLSearchParams();
        queryParams.append('timeRange', timeRange);
        queryParams.append('location', location);
        if (item) queryParams.append('item', item);

        const tbody = document.getElementById("entry-table-body");
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
        tbody.style.position = "relative";
        tbody.appendChild(spinner);
        entryTable.style.opacity = "0.5";
        entryTable.style.pointerEvents = "none";
        // tbody.appendChild(spinner);

        const response = await fetch(`/api/entries?type=entries-with-filters&${queryParams.toString()}`);
        if (!response.ok) throw new Error(`Fetch failed with status: ${response.status}`);

        const entries = await response.json();
        console.log("Entries fetched:", entries);

        tbody.innerHTML = entries.length > 0
            ? entries.map(entry => `
                <tr>
                    <td>${entry.name || '-'}</td>
                    <td>${entry.description || '-'}</td>
                    <td>${entry.approx_date || '-'}</td>
                    <td>${entry.approx_age || '-'}</td>
                    <td>${entry.ethnicity || '-'}</td>
                    <td>Picture Placeholder</td>
                    <td>${new Date(entry.created_at).toLocaleDateString() || '-'}</td>
                </tr>
            `).join("")
            : "<tr><td colspan='7'>No entries found for this filter.</td></tr>";
    } catch (error) {
        console.error('Error fetching entries:', error);
    } finally {
        const entryTable = document.querySelector("#entry-table");
        entryTable.style.opacity = "1";
        entryTable.style.pointerEvents = "auto";
        const spinner = document.querySelector(".csf-spinner");
        if (spinner) spinner.remove();
    }
}





// format date
function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) {
        console.warn(`Invalid date string: ${dateString}`);
        return dateString; // raw input if parsing fails
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
        const response = await fetch('/api/entries?type=unique-items');
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const items = await response.json();
        const itemList = document.getElementById('item-list');

        if (!itemList) throw new Error('Datalist element not found');

        itemList.innerHTML = ''; // clear current items

        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.name; // assuming `name` is the unique item in the database
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

    try {
        const suggestions = await fetch(`/api/entries?type=unique-items-fuzzy&searchQuery=${encodeURIComponent(query)}`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
                return res.json();
            });

        console.log('Suggestions:', suggestions);

        if (Array.isArray(suggestions)) {
            const matched = suggestions.filter(item => item.name.toLowerCase().includes(query)); // assuming suggestions have a `name` field
            if (matched.length === 0) {
                console.warn('Item not found');
            } else {
                const itemList = document.getElementById('item-list');
                itemList.innerHTML = ''; // clear current items
                matched.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.name; // assuming `name` is the field
                    itemList.appendChild(option);
                });
            }
        } else {
            console.error('The suggestions are not an array:', suggestions);
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
});

// filter location

// show/hide location input depending on toggle state
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
const locationOfEntry = document.getElementById('filter-location-toggle').checked
    ? 'Global'
    : document.getElementById('local-location').value || 'Unknown';

// UTILITY

// prevent form submission on enter and trigger updateFilters instead
document.getElementById('entry-filters-form').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        updateFilters();
    }
});

// merge cells in table - approach 1
function mergeEntryTableCells(tableBodyId, columnIndex) {
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




















document.addEventListener("DOMContentLoaded", () => {
    const loveTestTableBody = document.querySelector("#love-test-table tbody");
    const loveMeterBar = document.getElementById("love-meter-bar");
    const loveScoreDisplay = document.getElementById("love-score");

    let loveTestItems = [];
    let loveScore = 0;

    // Add event listener to the recent entries table
    document.querySelector("#entry-table tbody").addEventListener("click", (e) => {
        const target = e.target.closest("tr");
        if (!target || target.children.length === 0) return;

        const description = target.children[1]?.textContent.trim();
        if (!description) return;

        // Check if the description already exists in the love test table
        if (loveTestItems.includes(description)) return;

        // Add the description to the love test table
        loveTestItems.push(description);
        updateLoveTestTable();
    });

    // Function to update the love test table and calculate the score
    function updateLoveTestTable() {
        loveTestTableBody.innerHTML = "";
        loveScore = 0;

        const row = document.createElement("tr");

        loveTestItems.forEach((item, index) => {
            const cell = document.createElement("td");
            cell.textContent = item;
            cell.style.cursor = "pointer";
            cell.addEventListener("click", () => removeItemFromLoveTest(index));
            row.appendChild(cell);

            // Update score
            if (item.toLowerCase().includes("love")) loveScore += 2;
            if (item.toLowerCase().includes("happy")) loveScore += 1;
            if (item.toLowerCase().includes("hate")) loveScore -= 2;
        });

        loveTestTableBody.appendChild(row);

        if (loveTestItems.length === 0) {
            loveTestTableBody.innerHTML = `
                <tr>
                    <td>Click on an item in the above table to add to your love check</td>
                </tr>
            `;
        }

        updateLoveMeter();
    }

    // Function to remove an item from the love test table
    function removeItemFromLoveTest(index) {
        loveTestItems.splice(index, 1);
        updateLoveTestTable();
    }

    // Function to update the love meter
    function updateLoveMeter() {
        const maxScore = loveTestItems.length * 2; // Assuming max score of +2 per item
        const meterPercentage = maxScore > 0 ? (loveScore / maxScore) * 100 : 0;

        loveMeterBar.style.width = `${Math.max(0, Math.min(100, meterPercentage))}%`;
        loveMeterBar.style.backgroundColor = loveScore > 0 ? "green" : loveScore < 0 ? "red" : "gray";
        loveScoreDisplay.textContent = `Score: ${loveScore}`;
    }
});





