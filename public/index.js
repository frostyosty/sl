let currentPage = 0;
const pageSize = 10; // Number of entries per batch

async function fetchEntries(item = '', timeRange = '', loadMore = false) {
    const recentEntriesContainer = document.querySelector("#entry-table-container");
    const tableBody = document.querySelector("#entry-table-body");

    if (!tableBody) {
        console.error("Table body not found. Check the HTML structure and ensure the script runs after the table is loaded.");
        return;
    }

    if (!loadMore) {
        tableBody.innerHTML = '';
        currentPage = 0; // Reset pagination if not loading more
    }

    const spinner = document.createElement("div");
    spinner.classList.add("entry-spinner");
    spinner.innerHTML = `
      <div class="csf-letter">E</div>
      <div class="csf-letter"> </div>
      <div class="csf-letter">S</div>
    `;
    spinner.style.position = "absolute";
    spinner.style.top = "200%";
    spinner.style.left = "50%";
    spinner.style.transform = "translate(-50%, -50%)";
    spinner.style.display = "flex";
    spinner.style.gap = "5px";
    spinner.style.alignItems = "center";
    spinner.style.justifyContent = "center";
    spinner.style.padding = "10px 15px";
    spinner.style.border = "2px solid rgba(0, 0, 0, 0.2)";
    spinner.style.borderRadius = "8px";
    spinner.style.background = "rgba(255, 255, 255, 0.8)";
    spinner.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
    spinner.style.backdropFilter = "blur(5px)";
    spinner.style.fontFamily = "Arial, sans-serif";
    spinner.style.fontSize = "16px";
    spinner.style.fontWeight = "bold";
    spinner.style.color = "#333";
    
    recentEntriesContainer.style.position = "relative"; // make sure the container can position children absolutely
    recentEntriesContainer.appendChild(spinner);

    try {
        const params = new URLSearchParams({
            item,
            timeRange,
            page: currentPage,
            size: pageSize
        });

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

        const colors = ['#e6e6ff', '#b3b3ff', '#9999ff']; // Purple shades
        const pattern = [0, 1, 2, 1, 2, 0, 2, 1, 0, 2, 0, 1, 0, 2, 1, 0, 1, 2];

        entries.forEach((entry, index) => {
            const color = colors[pattern[(currentPage * pageSize + index) % pattern.length]];

            const row = document.createElement('tr');
            row.classList.add('desktop-row');
            row.style.backgroundColor = color;
            row.innerHTML = 
                `<td>${entry.name || '-'}</td>
                <td>${entry.description || '-'}</td>
                <td>${entry.approx_date || '-'}</td>
                <td>${entry.approx_age || '-'}</td>
                <td>${entry.ethnicity || '-'}</td>
                <td>Picture Placeholder</td>
                <td>${new Date(entry.created_at).toLocaleDateString() || '-'}</td>`;
            tableBody.appendChild(row);

            const mobileRow1 = document.createElement('tr');
            mobileRow1.classList.add('mobile-row');
            mobileRow1.style.backgroundColor = color;
            mobileRow1.innerHTML = 
                `<td>${entry.name || '-'}</td>
                <td>${entry.description || '-'}</td>
                <td></td>`;
            tableBody.appendChild(mobileRow1);

            const mobileRow2 = document.createElement('tr');
            mobileRow2.classList.add('mobile-row');
            mobileRow2.style.backgroundColor = color;
            mobileRow2.innerHTML = 
                `<td colspan="3">${entry.approx_age || '-'}, ${entry.ethnicity || '-'}, ${entry.approx_date || '-'}</td>`;
            tableBody.appendChild(mobileRow2);
        });

        console.log(`Entries length: ${entries.length}, Page size: ${pageSize}`);
        if (entries.length === pageSize) {
            const loadMoreRow = document.createElement('tr');
            loadMoreRow.innerHTML = `<td colspan="7" style="text-align:center; cursor:pointer; color:blue;">Load More</td>`;
            loadMoreRow.addEventListener('click', () => fetchEntries(item, timeRange, true));
            tableBody.appendChild(loadMoreRow);
        }

        currentPage++;
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
// document.getElementById('entry-table-body').addEventListener('click', (event) => {
//     const cell = event.target;
//     const column = cell.cellIndex;

//     if (column === 0 || column === 1) { // items given or received columns
//         const items = cell.innerText.split(',').map(item => item.trim());
//         const clickX = event.clientX - cell.getBoundingClientRect().left; // click position in cell
//         let cumulativeWidth = 0;
//         const clickedItem = items.find(item => {
//             const tempSpan = document.createElement('span');
//             tempSpan.style.visibility = 'hidden';
//             tempSpan.style.position = 'absolute';
//             tempSpan.textContent = item + ", ";
//             document.body.appendChild(tempSpan);
//             const itemWidth = tempSpan.getBoundingClientRect().width;
//             cumulativeWidth += itemWidth;
//             document.body.removeChild(tempSpan);
//             return clickX <= cumulativeWidth;
//         });

//         if (clickedItem) {
//             document.getElementById('filter-item').value = clickedItem; // set clicked item in filter
//             updateFilters();
//         } else {
//             console.error("no item detected at clicked position.");
//         }
//         updateFilters();
//     }
// });

// update filters on any change
document.querySelectorAll('input[name="time-range"]').forEach(radio => {
    radio.addEventListener('change', () => updateFilters());
});

let debounceTimerForEntriesItemFilter;
document.getElementById('filter-item').addEventListener('input', () => {
    clearTimeout(debounceTimerForEntriesItemFilter);
    debounceTimerForEntriesItemFilter = setTimeout(() => updateFilters(), 300);
});



async function updateFilters() {
    try {
        const form = document.getElementById('entry-filters-form');

        const timeRange = form.querySelector('input[name="time-range"]:checked')?.value || "all";
        const itemElement = form.querySelector('#filter-item');
        const item = itemElement ? itemElement.value : null;

        console.log("Filter details:", { timeRange, item });

        const queryParams = new URLSearchParams();
        queryParams.append('timeRange', timeRange);
        if (item) queryParams.append('item', item);

        const tbody = document.getElementById("entry-table-body");

        // Show spinner
        const spinner = document.createElement("div");
        spinner.classList.add("es-spinner");
        spinner.innerHTML = `<div class="csf-letter">E</div><div class="csf-letter"> </div><div class="csf-letter">S</div>`;
        spinner.style.position = "absolute";
        spinner.style.top = "50%";
        spinner.style.left = "50%";
        spinner.style.transform = "translate(-50%, -50%)";
        tbody.style.position = "relative";
        tbody.appendChild(spinner);

        const entryTable = document.querySelector("#entry-table");
        entryTable.style.opacity = "0.5";
        entryTable.style.pointerEvents = "none";

        const response = await fetch(`/api/entries?type=entries-with-filters&${queryParams.toString()}`);
        if (!response.ok) throw new Error(`Fetch failed with status: ${response.status}`);

        const entries = await response.json();
        console.log("Entries fetched:", entries);

        // Animate row removal
        const currentRows = Array.from(tbody.rows);
        currentRows.forEach((row, index) => {
            removeRowWithAnimation(tbody.id, index);
        });

        // Delay to allow row removal animation to complete
        setTimeout(() => {
            tbody.innerHTML = ""; // Clear rows after animation

            // Add new rows with animation
            entries.forEach(entry => {
                addRowWithAnimation(tbody.id, [
                    entry.name || '-',
                    entry.description || '-',
                    entry.approx_date || '-',
                    entry.approx_age || '-',
                    entry.ethnicity || '-',
                    'Picture Placeholder',
                    new Date(entry.created_at).toLocaleDateString() || '-'
                ]);
            });

            if (entries.length === 0) {
                addRowWithAnimation(tbody.id, ["No entries found for this filter.", '', '', '', '', '', '']);
            }
        }, 500); // Matches the row removal animation duration

    } catch (error) {
        console.error('Error fetching entries:', error);
    } finally {
        const entryTable = document.querySelector("#entry-table");
        entryTable.style.opacity = "1";
        entryTable.style.pointerEvents = "auto";
        const spinner = document.querySelector(".es-spinner");
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
            const matched = suggestions.filter(item => item.name && item.name.toLowerCase().includes(query)); // check if item.name exists
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

// UTILITY



// adding removing rows

function addRowWithAnimation(tableId, rowData) {
    const table = document.getElementById(tableId);
    const row = table.insertRow();
    row.style.display = 'none';
    row.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
    row.style.transform = 'translateY(-100%)';
    row.style.opacity = '0';
    rowData.forEach(data => {
        const cell = row.insertCell();
        cell.textContent = data;
    });
    requestAnimationFrame(() => {
        row.style.display = '';
        row.style.transform = 'translateY(0)';
        row.style.opacity = '1';
    });
}

function removeRowWithAnimation(tableId, rowIndex) {
    const table = document.getElementById(tableId);
    const row = table.rows[rowIndex];
    row.style.transition = 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out';
    row.style.transform = 'translateY(100%)';
    row.style.opacity = '0';
    row.addEventListener('transitionend', () => table.deleteRow(rowIndex));
}




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
    const loveMeter = document.getElementById("love-meter");
    const loveMeterBar = document.getElementById("love-meter-bar");
    const loveScoreDisplay = document.getElementById("love-score");
    const loveTestTable = document.getElementById("love-test-table");
    const loveTestHeader = loveTestTable.querySelector("th");

    let loveTestItems = [];
    let loveScore = 0;

    document.querySelector("#entry-table tbody").addEventListener("click", (e) => {
        const target = e.target.closest("tr");
        if (!target || target.children.length === 0) return;

        const description = target.children[1]?.textContent.trim();
        if (!description) return;

        if (loveTestItems.includes(description)) return;

        loveTestItems.push(description);
        updateLoveTestTable();
    });

function showFloatingHearts() {
    const heartContainer = document.createElement('div');
    heartContainer.classList.add('floating-hearts');
    document.body.appendChild(heartContainer);

    for (let i = 0; i < 5; i++) {
        const heart = document.createElement('div');
        heart.classList.add('heart');
        heart.textContent = '❤';
        heart.style.left = `${Math.random() * 100}%`;
        heart.style.animationDelay = `${Math.random() * 2}s`;
        heartContainer.appendChild(heart);
    }

    setTimeout(() => {
        heartContainer.remove();
    }, 3000); // Remove the hearts after animation
}



// scoring


    const scoringRules = {
        love: 2,
        happy: 1,
        grind: -2,
        sex: -2,
        kiss: -1,
        whore: -3,
        bitch: -1,
        fuck: -1,
        slept: -2,
        sleep: -2,
        making: -3,
        lewd: -2,
        hitting: -2,
        dude: -3,
        intoxicated: -2,
        dancing: -2,
        twerking: -1,
        slutty: -2,
        instagram: -1,
        tiktok: -2,
        facebook: -1,
    };


    function calculateScore(item) {
        let score = 0;
        Object.keys(scoringRules).forEach(keyword => {
            if (item.toLowerCase().includes(keyword)) {
                score += scoringRules[keyword];
            }
        });
        return score;
    }
    function updateLoveTestTable() {
        const loveTestTableBody = document.querySelector("#love-test-table tbody");
        loveTestTableBody.innerHTML = ''; // Clear the existing table
        loveScore = 0; // Reset loveScore
    
        loveTestItems.forEach((item, index) => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${item}</td>`;
    
            row.style.opacity = "0";
            row.style.transform = "translateY(-10px)";
            loveTestTableBody.appendChild(row);
    
            requestAnimationFrame(() => {
                row.style.transition = "opacity 0.5s ease, transform 0.5s ease";
                row.style.opacity = "1";
                row.style.transform = "translateY(0)";
            });
    
            // Add the item's score to the total
            loveScore += calculateScore(item);
    
            // Add click event to remove the row
            row.addEventListener("click", () => removeItemFromLoveTest(index, row));
        });
    
        if (loveTestItems.length === 0) {
            loveTestTableBody.innerHTML = `
                <tr>
                    <td>Click on an item in the table to add to your love check</td>
                </tr>
            `;
        }
    
        updateCurlyBracketHeight();
        updateLoveMeter();
        updateColspan();
    
        if (window.innerWidth <= 768) {
            const loveTestSection = document.getElementById('love test');
            loveTestSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }


    function removeItemFromLoveTest(index, row) {
        const item = loveTestItems[index];
        const originalScore = calculateScore(item);
    
        row.style.transition = "opacity 0.5s ease, transform 0.5s ease";
        row.style.opacity = "0";
        row.style.transform = "translateY(-10px)";
    
        row.addEventListener("transitionend", () => {
            // Add one more to the reversal score
            const reversedScore = originalScore < 0 ? -originalScore + 1 : originalScore + 1;
            loveScore += reversedScore;
            console.log("Updated loveScore:", loveScore);
    
            // Remove the item from the love test items array
            loveTestItems.splice(index, 1);
            console.log("Updated loveTestItems:", loveTestItems);
    
            // Trigger floating hearts animation if score is 0 or higher
            if (loveScore >= 0) {
                showFloatingHearts();
            }
    
            // Update the table and meter to reflect the changes
            updateLoveTestTable();
        }, { once: true });
    }
    
    function updateLoveMeter() {
        const maxScore = loveTestItems.length * 2; // Assuming each item originally adds 2 to the score
        const meterPercentage = maxScore > 0 ? (loveScore / maxScore) * 100 : 0;
    
        const newHeight = meterPercentage < 50 ? 40 : 60;
        loveMeterBar.style.height = `${newHeight}%`;
    
        setTimeout(() => {
            loveMeterBar.style.height = '50%';
        }, 2000);
    
        const color = determineColor(meterPercentage);
        smoothGradientTransition(loveMeterBar, color);
    
        loveMeter.classList.add('swirl');
        loveMeterBar.classList.add('shake');
    
        loveMeterBar.addEventListener('animationend', () => {
            loveMeterBar.classList.remove('shake');
        }, { once: true });
    
        setTimeout(() => loveMeter.classList.remove('swirl'), 500);
    
        let verdict;
        if (loveScore >= 0) {
            verdict = `Could be worse`;
        } else if (loveScore === 1) {
            verdict = "That's an improvement";
        } else if (loveScore === 2) {
            verdict = "I'm glad you removed that last one";
        } else if (loveScore >= 3) {
            verdict = "Nobody's perfect but this one will do";
        } else if (loveScore === -1) {
            verdict = "Might not be love";
        } else if (loveScore === -2) {
            verdict = "Probably not the one";
        } else if (loveScore === -3) {
            verdict = "Slightly doubtful";
        } else if (loveScore === -4) {
            verdict = "I'd be worried";
        } else if (loveScore === -5) {
            verdict = "It's looking bleak";
        } else if (loveScore === -6) {
            verdict = "Signs are not good";
        } else if (loveScore === -7) {
            verdict = "Questions need answers";
        } else if (loveScore === -8) {
            verdict = "Doubts creeping in";
        } else if (loveScore === -9) {
            verdict = "Could be a slut";
        } else if (loveScore === -10) {
            verdict = "You should reconsider";
        } else if (loveScore === -11) {
            verdict = "Hard no";
        } else if (loveScore === -12) {
            verdict = "Compatibility issues";
        } else if (loveScore === -13) {
            verdict = "Probably a slut";
        } else if (loveScore === -14) {
            verdict = "Things seem off";
        } else if (loveScore === -15) {
            verdict = "Definitely a whore";
        } else if (loveScore === -16) {
            verdict = "Serious mismatch";
        } else if (loveScore === -17) {
            verdict = "Absolutely disgusting";
        } else if (loveScore === -18) {
            verdict = "S-whore-ly not...";
        } else if (loveScore === -19) {
            verdict = "Something's deeply wrong";
        } else if (loveScore === -20) {
            verdict = "Run the other way!";
        } else if (loveScore === -21) {
            verdict = "Avoid avoid avoid";
        } else if (loveScore === -22) {
            verdict = "Pure evil";
        } else if (loveScore === -23) {
            verdict = "No redeeming features";
        } else if (loveScore === -24) {
            verdict = "Beware the snakes";
        } else if (loveScore === -25) {
            verdict = "Unimaginably bad!";
        } else {
            verdict = "Worst whore ever";
        }
        if (loveScoreDisplay.classList.contains('fade')) {
            loveScoreDisplay.classList.remove('fade');
        }
        loveScoreDisplay.textContent = verdict;
        setTimeout(() => {
            loveScoreDisplay.classList.add('fade');
        }, 10);
    }




    // other stuff


    function showFloatingHearts() {
        const heartContainer = document.createElement('div');
        heartContainer.classList.add('floating-hearts');
        document.body.appendChild(heartContainer);
    
        for (let i = 0; i < 5; i++) {
            const heart = document.createElement('div');
            heart.classList.add('heart');
            heart.textContent = '❤';
            heart.style.left = `${Math.random() * 100}%`;
            heart.style.animationDelay = `${Math.random() * 2}s`;
            heartContainer.appendChild(heart);
        }
    
        setTimeout(() => {
            heartContainer.remove();
        }, 3000); // Remove the hearts after animation
    }


    function smoothGradientTransition(element, newColor) {
        element.style.transition = 'background 3s ease-in-out';
        element.style.background = generateGradient(newColor);
    
        if (loveScore <= -10) {
            triggerSkullAndBonesAnimation();
        }
    
        setTimeout(() => {
            element.style.transition = 'background 0.3s ease-in-out, height 2s ease-in-out';
        }, 3000);
    }
    

    
    function triggerSkullAndBonesAnimation() {
        const skullAndBones = document.getElementById('skullAndBones');
        skullAndBones.style.animation = 'emergeAndFade 3s ease-in-out';
        
        // Reset the animation after it's done to allow re-triggering
        skullAndBones.addEventListener('animationend', () => {
            skullAndBones.style.animation = '';
        }, { once: true });
    }

    function generateGradient(baseColor) {
        const [r, g, b] = baseColor.match(/\w\w/g).map(c => parseInt(c, 16));
        const lighterColor = `rgb(${Math.min(r + 20, 255)}, ${Math.min(g + 20, 255)}, ${Math.min(b + 20, 255)})`;
        const darkerColor = `rgb(${Math.max(r - 20, 0)}, ${Math.max(g - 20, 0)}, ${Math.max(b - 20, 0)})`;
        return `linear-gradient(to bottom, ${lighterColor}, ${darkerColor})`;
    }
    
    function determineColor(meterPercentage) {
        const lowColor = '#8b4513';
        const highColor = '#ff0000';
        const negativeColor = '#008000';
        const extremeNegativeColor = '#000000';
    
        if (loveScore <= -10) {
            return extremeNegativeColor;
        } else if (loveScore < -5) {
            return negativeColor;
        } else {
            return interpolateColor(lowColor, highColor, meterPercentage / 100);
        }
    }
    

    function interpolateColor(color1, color2, factor) {
        const result = color1.match(/\w\w/g).map((c, i) => {
            const num1 = parseInt(c, 16);
            const num2 = parseInt(color2.match(/\w\w/g)[i], 16);
            return Math.round(num1 + (num2 - num1) * factor).toString(16).padStart(2, '0');
        });
        return `#${result.join('')}`;
    }

    function updateCurlyBracketHeight() {
        const loveTestTable = document.getElementById("love-test-table");
        const curlyBracket = document.getElementById("curly-bracket");
        const rows = loveTestTable.querySelectorAll("tbody tr");
    
        if (rows.length > 2) {
            const height = Array.from(rows).slice(1).reduce((acc, row) => acc + row.offsetHeight, 0); // Ignore the first row (header)
            const firstRowHeight = rows[0].offsetHeight; // Get the height of the first row (header)
            
            curlyBracket.style.height = `${height}px`;
            curlyBracket.style.top = `${firstRowHeight}px`; // Position it below the header row
            curlyBracket.style.display = 'block';
        } else {
            curlyBracket.style.display = 'none';
        }
    }
    

    function updateColspan() {
        const columnCount = loveTestTable.querySelector("tbody tr")?.children.length || 1;
        loveTestHeader.colSpan = columnCount;
    }


    updateColspan();
});



