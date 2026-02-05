// 1. Initialize Database (Updated Version 2)
const db = new Dexie('AstroAppDB');
// Change version to 3 and add 'dob'
db.version(3).stores({
    clients: '++id, name, star, phone, location, age, dob, profession' 
});

// DOM Elements
const modal = document.getElementById('clientFormModal');
const form = document.getElementById('clientForm');
const historyList = document.getElementById('historyList');
const searchInput = document.getElementById('searchInput');

// Load list on startup
updateList();

// --- CORE FUNCTIONS ---

// 1. Show Form (New or Edit)
function showForm() {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Stop background scrolling
}

function closeForm() {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    form.reset();
    document.getElementById('clientId').value = "";
    document.getElementById('historyList').innerHTML = "<p style='color:#888; text-align:center;'>No previous history</p>";
}

// 2. SAVE CLIENT (Handles Logic)
form.onsubmit = async (event) => {
    event.preventDefault();
    
    // Get Basic Data
    const id = document.getElementById('clientId').value;
    const basicData = {
        name: document.getElementById('name').value,
        star: document.getElementById('star').value,
        dob: document.getElementById('dob').value, // <--- ADD THIS LINE
        age: document.getElementById('age').value,
        location: document.getElementById('place').value,
        phone: document.getElementById('phone').value,
        profession: document.getElementById('profession').value,
        updated: new Date()
    };

    // Get New Consultation Data
    const problem = document.getElementById('currentProblem').value.trim();
    const solution = document.getElementById('currentSolution').value.trim();
    
    let consultationEntry = null;
    if (problem || solution) {
        consultationEntry = {
            date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            timestamp: Date.now(),
            problem: problem,
            solution: solution
        };
    }

    if (id) {
        // UPDATE EXISTING CLIENT
        const client = await db.clients.get(parseInt(id));
        let history = client.consultations || [];
        
        // Add new consultation to history if text exists
        if (consultationEntry) {
            history.unshift(consultationEntry); // Add to top
        }

        await db.clients.update(parseInt(id), { ...basicData, consultations: history });

    } else {
        // CREATE NEW CLIENT
        const history = consultationEntry ? [consultationEntry] : [];
        await db.clients.add({ ...basicData, consultations: history });
    }

    closeForm();
    updateList();
    alert("Saved Successfully!");
};

// 3. LOAD CLIENT (View/Edit)
window.loadClient = async (id) => {
    const client = await db.clients.get(id);
    if(!client) return;

    // Fill Basic Inputs
    document.getElementById('clientId').value = client.id;
    document.getElementById('name').value = client.name;
    document.getElementById('star').value = client.star || "";
    document.getElementById('dob').value = client.dob || "";
    document.getElementById('age').value = client.age || "";
    document.getElementById('place').value = client.location || "";
    document.getElementById('phone').value = client.phone || "";
    document.getElementById('profession').value = client.profession || "";

    // Render History (Previous Consultations)
    const listDiv = document.getElementById('historyList');
    listDiv.innerHTML = "";

    if (client.consultations && client.consultations.length > 0) {
        client.consultations.forEach(item => {
            listDiv.innerHTML += `
                <div class="history-item">
                    <span class="history-date">${item.date}</span>
                    <span class="history-label">Problem:</span>
                    <div class="history-text">${item.problem || '-'}</div>
                    <span class="history-label" style="color:#1976D2">Solution:</span>
                    <div class="history-text">${item.solution || '-'}</div>
                </div>
            `;
        });
    } else {
        listDiv.innerHTML = "<p style='color:#888; text-align:center;'>No previous consultations.</p>";
    }

    showForm();
};

// 4. DISPLAY LIST (Main Screen)
async function updateList() {
    const query = searchInput.value.toLowerCase();
    let clients = await db.clients.toArray();

    if (query) {
        clients = clients.filter(c => c.name.toLowerCase().includes(query));
    }
    
    clients.reverse(); // Newest first

    const listDiv = document.getElementById('clientList');
    listDiv.innerHTML = clients.map(client => `
        <div class="client-item" onclick="loadClient(${client.id})">
            <div class="client-info">
                <h4>${client.name}</h4>
                <p>${client.star || ''} ${client.location ? '• ' + client.location : ''}</p>
            </div>
            <div class="actions">
                <button class="btn-view">View</button>
            </div>
        </div>
    `).join('');
}

// 5. GENERATE PDF
window.generatePDF = async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Get Form Values
    const name = document.getElementById('name').value;
    const star = document.getElementById('star').value;
    const age = document.getElementById('age').value;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(46, 125, 50); // Green color
    doc.text("Pratnya Astro Solutions", 105, 20, null, null, "center");
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Client: ${name}`, 20, 40);
    doc.text(`Star: ${star}   Age: ${age}`, 20, 50);
    
    // Prepare History Table Data
    const id = document.getElementById('clientId').value;
    if(id) {
        const client = await db.clients.get(parseInt(id));
        if(client && client.consultations) {
            const tableData = client.consultations.map(c => [
                c.date, 
                c.problem, 
                c.solution
            ]);

            doc.autoTable({
                startY: 60,
                head: [['Date', 'Problems', 'Solution']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: [46, 125, 50] }
            });
        }
    }

    doc.save(`${name}_Report.pdf`);
};

// Search Listener
searchInput.oninput = () => updateList();
// AUTO-CALCULATE AGE
function calculateAge() {
    const dobInput = document.getElementById('dob').value;
    if (!dobInput) return;

    const dob = new Date(dobInput);
    const today = new Date();
    
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    // Adjust if birthday hasn't happened yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    document.getElementById('age').value = age;
}