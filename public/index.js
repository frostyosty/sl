
// fetch and display entries in the recent entries table
async function fetchEntries(selectedCriteria = '') {
    const recentEntriesContainer = document.querySelector("#recent-entries-table");
    const tableBody = document.querySelector("#recent-entries-table tbody");
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
        const url = `/api/entries${selectedCriteria ? `?criteria=${encodeURIComponent(selectedCriteria)}` : ''}`;
        console.log("Fetching entries from URL:", url);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error: ${response.statusText}`);

        const entries = await response.json();
        console.log("Fetched entries:", entries);

        entries.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.name || '-'}</td>
                <td>${entry.description || '-'}</td>
                <td>${entry.approx_date || '-'}</td>
                <td>${entry.approx_age || '-'}</td>
                <td>${entry.ethnicity || '-'}</td>
                <td>${entry.timestamp || '-'}</td>
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

// handle the "Add Entry" form submission
document.getElementById('entry-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const description = document.getElementById('description').value.trim();
    const approxDate = document.getElementById('approx-date').value.trim();
    const approxAge = document.querySelector('input[name="approx-age"]:checked')?.value || '-';
    const ethnicity = document.getElementById('ethnicity').value.trim();

    if (!name) {
        alert("Name is required.");
        return;
    }

    const entry = {
        name,
        description,
        approx_date: approxDate || '-',
        approx_age: approxAge,
        ethnicity: ethnicity || '-'
    };

    const tableBody = document.querySelector("#recent-entries-table tbody");
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${entry.name}</td>
        <td>${entry.description}</td>
        <td>${entry.approx_date}</td>
        <td>${entry.approx_age}</td>
        <td>${entry.ethnicity}</td>
        <td>${new Date().toLocaleDateString()}</td>
    `;
    tableBody.prepend(newRow);

    console.log("Entry payload:", entry);

    try {
        const response = await fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        });
        if (!response.ok) throw new Error(`Error: ${response.statusText}`);

        console.log("Entry submitted successfully.");
        document.getElementById('entry-form').reset();
    } catch (error) {
        console.error("Error submitting entry:", error);
        newRow.remove();
    }
});

// "Today" and "Yesterday" button functionality for approx date
document.querySelectorAll('.date-button').forEach(button => {
    button.addEventListener('click', () => {
        const dateInput = document.getElementById('approx-date');
        const today = new Date();
        const offset = button.id === 'yesterday-button' ? -1 : 0;
        today.setDate(today.getDate() + offset);
        dateInput.value = today.toISOString().split('T')[0];
    });
});

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded event fired.");
    fetchEntries();
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
        const name = document.getElementById('filter-name').value || null;
        const description = document.getElementById('filter-description').value || null;
        const timeRange = document.querySelector('input[name="time-range"]:checked')?.value || "all";
        const locationToggle = document.getElementById('filter-location-toggle').checked;
        const location = locationToggle ? "global" : document.getElementById('local-location').value || "";

        console.log("Filter details:", { name, description, timeRange, location });

        const queryParams = new URLSearchParams();
        if (name) queryParams.append('name', name);
        if (description) queryParams.append('description', description);
        queryParams.append('timeRange', timeRange);
        queryParams.append('location', location);

        const entryTable = document.querySelector("#entry-table");
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

        const response = await fetch(`/api/entries?type=entries-with-filters&${queryParams.toString()}`);
        if (!response.ok) throw new Error(`Fetch failed with status: ${response.status}`);

        const entries = await response.json();
        console.log("Entries fetched:", entries);

        const hasEntries = entries.length > 0;

        tbody.innerHTML = hasEntries
            ? entries.map(entry => `
                <tr>
                    <td>${entry.name}</td>
                    <td>${entry.description}</td>
                    <td>${entry.approx_date || "n/a"}</td>
                    <td>${entry.ethnicity || "n/a"}</td>
                </tr>
            `).join("")
            : "<tr><td colspan='4'>No entries found for this filter.</td></tr>";

        document.querySelectorAll("#entry-table th:nth-child(3), #entry-table td:nth-child(3)")
            .forEach(cell => cell.style.display = "table-cell");

        mergeEntryTableCells('entry-table-body', 2);
        mergeEntryTableCells('entry-table-body', 3);

        const totalEntries = entries.length;
        console.log('Total entries:', totalEntries);
        const totalEthnicities = new Set(entries.map(entry => entry.ethnicity)).size;

        const desirability = totalEntries > 0 ? (totalEntries / entries.length).toFixed(2) : 0;
        const diversity = totalEthnicities > 0 ? (totalEthnicities / totalEntries).toFixed(2) : 0;

        document.getElementById('stats-desirability').innerText = desirability;
        document.getElementById('stats-diversity').innerText = diversity;

        const statsSection = document.getElementById('stats-section');
        const statsItems = statsSection.querySelectorAll('.stats-item');
        statsSection.style.display = 'flex';
        statsItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.8)';
            setTimeout(() => {
                item.style.transition = 'opacity 0.5s, transform 0.5s';
                item.style.opacity = '1';
                item.style.transform = 'scale(1)';
            }, index * 200);
        });
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

