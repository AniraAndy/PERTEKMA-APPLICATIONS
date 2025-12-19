// --- STATE MANAGEMENT ---
let fullList = [];        
let recommendedList = []; 
let reapplicantsList = [];
let historyStack = ['page-home'];

// Sort State
let sortState = {
    rec: { key: null, order: 'asc' },
    full: { key: null, order: 'asc' },
    re: { key: null, order: 'asc' }
};

// --- 1. STARTUP ---
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([loadFullList(), loadRecommendedList(), loadReapplicantsList()]);
        enrichRecommendedData();
        populateFilters();
        
        // --- NEW: ENABLE "ENTER" KEY FOR SEARCH ---
        const input = document.getElementById('searchInput');
        if(input) {
            input.addEventListener("keypress", function(event) {
                if (event.key === "Enter") {
                    event.preventDefault(); // Stop page refresh
                    performSearch();        // Click the search button virtually
                }
            });
        }

        console.log("System Ready.");
    } catch (error) {
        console.error("Error loading data:", error);
    }
});

// --- MERGE LOGIC ---
function enrichRecommendedData() {
    recommendedList.forEach(recStudent => {
        const recMatric = recStudent.matric.toString().replace(/[^0-9]/g, ""); 
        const match = fullList.find(master => 
            master.matric.toString().replace(/[^0-9]/g, "") === recMatric
        );

        if (match) {
            if (!recStudent.year || recStudent.year === "-") recStudent.year = match.year;
            if (!recStudent.course || recStudent.course === "-") recStudent.course = match.course;
            if (!recStudent.phone || recStudent.phone === "N/A") recStudent.phone = match.phone;
            if (!recStudent.email || recStudent.email === "N/A") recStudent.email = match.email;
            if (!recStudent.docLink || recStudent.docLink === "#") recStudent.docLink = match.docLink;
            recStudent.applied = match.applied; 
        }
    });
}

// --- FILTER & SORT LOGIC ---
function populateFilters() {
    const getUnique = (list, key) => {
        const values = list.map(item => item[key]).filter(val => val && val !== "-" && val !== "N/A");
        return [...new Set(values)].sort();
    };

    fillSelect('recFilterYear', getUnique(recommendedList, 'year'));
    fillSelect('recFilterCourse', getUnique(recommendedList, 'course'));
    fillSelect('recFilterPos', getUnique(recommendedList, 'suggested'));

    fillSelect('fullFilterYear', getUnique(fullList, 'year'));
    fillSelect('fullFilterCourse', getUnique(fullList, 'course'));
    fillSelect('fullFilterPos', getUnique(fullList, 'applied'));

    fillSelect('reFilterYear', getUnique(reapplicantsList, 'year'));
    fillSelect('reFilterCourse', getUnique(reapplicantsList, 'course'));
    fillSelect('reFilterPos', getUnique(reapplicantsList, 'applied'));
}

function fillSelect(id, values) {
    const select = document.getElementById(id);
    if(!select) return;
    select.innerHTML = select.options[0].outerHTML; 
    values.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.innerText = val;
        select.appendChild(opt);
    });
}

function setSort(listType, key) {
    sortState[listType].key = key;
    if(listType === 'rec') renderSuggested();
    else if(listType === 're') renderReapplicants();
    else renderFullList();
}

function sortData(data, key) {
    if (!key) return data; 
    return [...data].sort((a, b) => {
        let valA = a[key] ? a[key].toString().toLowerCase() : "";
        let valB = b[key] ? b[key].toString().toLowerCase() : "";
        if(key === 'year') {
             const numA = parseInt(valA.replace(/[^0-9]/g, "")) || 0;
             const numB = parseInt(valB.replace(/[^0-9]/g, "")) || 0;
             return numA - numB;
        }
        return valA.localeCompare(valB);
    });
}

// --- RENDER TABLES ---

function renderSuggested() {
    const tbody = document.getElementById('suggestedTableBody');
    tbody.innerHTML = "";
    
    const fYear = document.getElementById('recFilterYear').value;
    const fCourse = document.getElementById('recFilterCourse').value;
    const fPos = document.getElementById('recFilterPos').value;

    let filtered = recommendedList.filter(item => {
        if(fYear !== 'all' && item.year !== fYear) return false;
        if(fCourse !== 'all' && item.course !== fCourse) return false;
        if(fPos !== 'all' && item.suggested !== fPos) return false;
        return true;
    });

    filtered = sortData(filtered, sortState.rec.key);
    
    if(filtered.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No Matches Found.</td></tr>";
        return;
    }

    filtered.forEach(app => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${app.name}</td>
            <td>${app.matric}</td>
            <td>${app.year}</td>
            <td>${app.course}</td>
            <td style="color: var(--success); font-weight: 600;">${app.suggested}</td>
            <td>${(app.docLink && app.docLink !== "#") ? "✅" : "❌"}</td>
        `;
        tr.onclick = () => findAndShowDetails(app.matric, app.suggested); 
        tbody.appendChild(tr);
    });
}

function renderReapplicants() {
    const tbody = document.getElementById('reapplicantsTableBody');
    tbody.innerHTML = "";

    const fYear = document.getElementById('reFilterYear').value;
    const fCourse = document.getElementById('reFilterCourse').value;
    const fPos = document.getElementById('reFilterPos').value;

    let filtered = reapplicantsList.filter(item => {
        if(fYear !== 'all' && item.year !== fYear) return false;
        if(fCourse !== 'all' && item.course !== fCourse) return false;
        if(fPos !== 'all' && item.applied !== fPos) return false;
        return true;
    });

    filtered = sortData(filtered, sortState.re.key);

    if(filtered.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No Matches Found.</td></tr>";
        return;
    }

    filtered.forEach(app => {
        let appliedText = app.applied ? app.applied : "N/A";
        if (appliedText.length > 30) appliedText = appliedText.substring(0, 30) + "...";
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${app.name}</td>
            <td>${app.matric}</td>
            <td>${app.year}</td>
            <td>${app.course}</td>
            <td>${appliedText}</td>
            <td><a href="${app.docLink}" target="_blank" style="color:var(--accent);">View</a></td>
        `;
        tr.onclick = (e) => {
            if(e.target.tagName !== 'A') showDetails(app); 
        };
        tbody.appendChild(tr);
    });
}

function renderFullList() {
    const tbody = document.getElementById('fullListTableBody');
    tbody.innerHTML = "";

    const fYear = document.getElementById('fullFilterYear').value;
    const fCourse = document.getElementById('fullFilterCourse').value;
    const fPos = document.getElementById('fullFilterPos').value;

    let filtered = fullList.filter(item => {
        if(fYear !== 'all' && item.year !== fYear) return false;
        if(fCourse !== 'all' && item.course !== fCourse) return false;
        if(fPos !== 'all' && item.applied !== fPos) return false;
        return true;
    });

    filtered = sortData(filtered, sortState.full.key);

    if(filtered.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No Matches Found.</td></tr>";
        return;
    }

    filtered.forEach(app => {
        let appliedText = app.applied ? app.applied : "N/A";
        if (appliedText.length > 30) appliedText = appliedText.substring(0, 30) + "...";
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${app.name}</td>
            <td>${app.matric}</td>
            <td>${app.year}</td>
            <td>${app.course}</td>
            <td>${appliedText}</td>
            <td><a href="${app.docLink}" target="_blank" style="color:var(--accent);">View</a></td>
        `;
        tr.onclick = (e) => {
            if(e.target.tagName !== 'A') findAndShowDetails(app.matric, null);
        };
        tbody.appendChild(tr);
    });
}

// --- DATA LOADERS ---
async function loadStandardExcel(filename) {
    try {
        const response = await fetch(`./${filename}`);
        if (!response.ok) return [];
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let headerIdx = -1;
        let colMap = { name: -1, matric: -1, phone: -1, email: -1, course: -1, year: -1, applied: -1, doc: -1 };

        for(let i=0; i<Math.min(rawData.length, 10); i++) {
            const rowStr = (rawData[i]||[]).join(" ").toUpperCase();
            if(rowStr.includes("FULL NAME") && rowStr.includes("MATRIC")) {
                headerIdx = i;
                rawData[i].forEach((cell, cIdx) => {
                    const txt = (cell||"").toString().toUpperCase().trim();
                    if(txt.includes("FULL NAME")) colMap.name = cIdx;
                    if(txt.includes("MATRIC")) colMap.matric = cIdx;
                    if(txt.includes("PHONE")) colMap.phone = cIdx;
                    if(txt.includes("EMAIL")) colMap.email = cIdx;
                    if(txt.includes("COURSE")) colMap.course = cIdx;
                    if(txt.includes("YEAR")) colMap.year = cIdx;
                    if(txt.includes("POSITION")) colMap.applied = cIdx;
                    if(txt.includes("DOCUMENT")) colMap.doc = cIdx;
                });
                break;
            }
        }

        if(headerIdx === -1) return [];

        let students = [];
        for(let i = headerIdx + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if(!row || !row[colMap.name]) continue;
            students.push({
                name: row[colMap.name],
                matric: (row[colMap.matric] || "").toString().trim(),
                phone: colMap.phone > -1 ? row[colMap.phone] : "N/A",
                email: colMap.email > -1 ? row[colMap.email] : "N/A",
                course: colMap.course > -1 ? row[colMap.course] : "N/A",
                year: colMap.year > -1 ? (row[colMap.year] || "").toString() : "N/A",
                applied: colMap.applied > -1 ? row[colMap.applied] : "N/A",
                docLink: colMap.doc > -1 ? (row[colMap.doc] || "#") : "#"
            });
        }
        return students;

    } catch (e) { console.error(`Load Error ${filename}:`, e); return []; }
}

async function loadFullList() {
    fullList = await loadStandardExcel('data.xlsx');
}

async function loadReapplicantsList() {
    reapplicantsList = await loadStandardExcel('reapplicants.xlsx');
}

async function loadRecommendedList() {
    try {
        const response = await fetch('./recommended.xlsx');
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let headerIdx = -1;
        let colMap = { pos: -1, name: -1, matric: -1, doc: -1, year: -1, course: -1 };

        for(let i=0; i<Math.min(rawData.length, 10); i++) {
            const rowStr = (rawData[i]||[]).join(" ").toUpperCase();
            if(rowStr.includes("POSITION") && rowStr.includes("FULL NAME")) {
                headerIdx = i;
                rawData[i].forEach((cell, cIdx) => {
                    const txt = (cell||"").toString().toUpperCase().trim();
                    if(txt === "POSITION") colMap.pos = cIdx;
                    if(txt.includes("FULL NAME")) colMap.name = cIdx;
                    if(txt.includes("MATRIC")) colMap.matric = cIdx;
                    if(txt.includes("DOCUMENT")) colMap.doc = cIdx;
                    if(txt.includes("YEAR")) colMap.year = cIdx;
                    if(txt.includes("COURSE")) colMap.course = cIdx;
                });
                break;
            }
        }
        if(headerIdx === -1) return;

        let students = [];
        let lastPosition = "Recommended";

        for(let i = headerIdx + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if(!row) continue;
            const name = colMap.name > -1 ? row[colMap.name] : null;
            const matric = colMap.matric > -1 ? row[colMap.matric] : null;
            const pos = colMap.pos > -1 ? row[colMap.pos] : null;

            if (name && matric) {
                if (name.toString().toUpperCase().includes("FULL NAME")) continue;
                if (pos) lastPosition = pos;
                students.push({
                    name: name,
                    matric: matric.toString().trim(),
                    suggested: lastPosition,
                    docLink: colMap.doc > -1 ? (row[colMap.doc] || "#") : "#",
                    year: colMap.year > -1 ? (row[colMap.year] || "-") : "-",
                    course: colMap.course > -1 ? (row[colMap.course] || "-") : "-",
                    phone: "N/A", email: "N/A", applied: null
                });
            }
        }
        recommendedList = students;
    } catch (e) { console.error("Recommended Load Error:", e); }
}

// --- NAV & DETAILS ---
function navigateTo(pageId) {
    document.querySelectorAll('.page-section').forEach(section => section.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    if (historyStack[historyStack.length - 1] !== pageId) historyStack.push(pageId);
    
    if(pageId === 'page-suggested') renderSuggested();
    if(pageId === 'page-full-list') renderFullList();
    if(pageId === 'page-reapplicants') renderReapplicants();
}

function goBack() {
    if (historyStack.length > 1) {
        historyStack.pop(); 
        const prev = historyStack[historyStack.length - 1]; 
        document.querySelectorAll('.page-section').forEach(section => section.classList.remove('active'));
        document.getElementById(prev).classList.add('active');
    }
}

function findAndShowDetails(searchMatric, suggestedPosition) {
    const cleanSearch = searchMatric.toString().replace(/[^0-9]/g, "");
    let data = fullList.find(s => s.matric.toString().replace(/[^0-9]/g, "") === cleanSearch);
    
    if(!data) {
        data = reapplicantsList.find(s => s.matric.toString().replace(/[^0-9]/g, "") === cleanSearch);
    }

    let displayData = {};
    if (data) {
        displayData = { ...data };
        if(suggestedPosition) displayData.suggested = suggestedPosition;
    } else {
        const recData = recommendedList.find(r => r.matric === searchMatric);
        displayData = {
            name: recData ? recData.name : "Unknown",
            matric: searchMatric,
            phone: "N/A", email: "N/A", year: "-", course: "-",
            applied: "N/A", docLink: recData ? recData.docLink : "#", suggested: suggestedPosition
        };
    }
    showDetails(displayData);
}

function showDetails(app) {
    let positionHtml = "";
    if (app.applied && app.applied !== "N/A") {
        const bullets = app.applied.split(',').map(pos => `<li>${pos.trim()}</li>`).join('');
        positionHtml += `<div style="margin-top: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
            <span class="detail-label" style="display:block; margin-bottom:5px;">Positions Applied:</span>
            <ul style="margin: 0; padding-left: 20px; text-align: left;">${bullets}</ul></div>`;
    }
    if (app.suggested && app.suggested !== "N/A" && app.suggested !== "Recommended") {
        positionHtml += `<p style="background: #f0fdf4; padding: 10px; border-radius: 8px; border: 1px solid #bbf7d0; margin-top:10px;">
            <span class="detail-label" style="color: #15803d;">Suggested Position:</span> 
            <span style="font-weight:bold; color: #15803d;">${app.suggested}</span></p>`;
    }
    const content = document.getElementById('detailContent');
    content.innerHTML = `
        <p><span class="detail-label">Full Name:</span> ${app.name}</p>
        <p><span class="detail-label">Matric Number:</span> ${app.matric}</p>
        <p><span class="detail-label">Phone:</span> ${app.phone}</p>
        <p><span class="detail-label">Email:</span> ${app.email}</p>
        <p><span class="detail-label">Year of Study:</span> ${app.year}</p>
        <p><span class="detail-label">Course:</span> ${app.course}</p>
        ${positionHtml}`;
    
    const safeLink = (app.docLink && app.docLink !== "#") ? app.docLink : "#";
    const downloadBtn = document.getElementById('downloadLink');
    downloadBtn.href = safeLink;
    if (safeLink === "#") {
        downloadBtn.style.opacity = "0.5"; downloadBtn.style.pointerEvents = "none"; downloadBtn.innerText = "No Document Available";
    } else {
        downloadBtn.style.opacity = "1"; downloadBtn.style.pointerEvents = "auto"; downloadBtn.innerText = "View Documents";
    }
    navigateTo('page-details');
}

function performSearch() {
    if (fullList.length === 0) { alert("Data is loading."); return; }
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if(!query) { alert("Enter name or matric."); return; }
    
    let result = fullList.find(app => (app.name && app.name.toLowerCase().includes(query)) || (app.matric && app.matric.includes(query)));
    if(!result) {
        result = reapplicantsList.find(app => (app.name && app.name.toLowerCase().includes(query)) || (app.matric && app.matric.includes(query)));
    }

    if (result) showDetails(result); else alert("Applicant not found!");
}

function downloadExcel() {
    if (fullList.length === 0) { alert("No data."); return; }
    const exportData = fullList.map(app => ({
        "Full Name": app.name, "Matric": app.matric, "Year": app.year, "Course": app.course, "Applied": app.applied
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Applicants");
    XLSX.writeFile(workbook, "PERTEKMA_Applicants.xlsx");
}