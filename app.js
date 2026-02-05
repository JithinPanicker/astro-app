// 1. Initialize Database (Updated Version 2)
const db = new Dexie('AstroAppDB');
// Change version to 3 and add 'dob'
db.version(4).stores({
    clients: '++id, name, star, phone, location, age, dob, birthTime, profession' 
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
        birthTime: document.getElementById('birthTime').value,
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
    document.getElementById('birthTime').value = client.birthTime || ""; // <--- ADD THIS
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
// GENERATE PDF (Malayalam Supported)
window.generatePDF = async () => {
    const { jsPDF } = window.jspdf;
    
    // 1. Get Data
    const name = document.getElementById('name').value;
    const star = document.getElementById('star').value;
    const dob = document.getElementById('dob').value;
    const time = document.getElementById('birthTime').value; // 24h format
    
    // Convert Time to AM/PM for display
    let displayTime = time;
    if(time) {
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        displayTime = `${hour12}:${m} ${ampm}`;
    }

    // 2. Build HTML Content for PDF
    let htmlContent = `
        <table style="width: 100%; margin-bottom: 20px; font-size: 14px;">
            <tr><td><strong>Name:</strong> ${name}</td><td><strong>Star:</strong> ${star}</td></tr>
            <tr><td><strong>DOB:</strong> ${dob}</td><td><strong>Time:</strong> ${displayTime}</td></tr>
        </table>
        <h3>Consultation History</h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
            <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Details</th>
            </tr>
    `;

    // Add History Rows
    const id = document.getElementById('clientId').value;
    if(id) {
        const client = await db.clients.get(parseInt(id));
        if(client && client.consultations) {
            client.consultations.forEach(c => {
                htmlContent += `
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px; width: 25%; vertical-align: top;">${c.date}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">
                            <strong>Problem:</strong><br>${c.problem || '-'}<br><br>
                            <strong style="color: #2E7D32;">Solution:</strong><br>${c.solution || '-'}
                        </td>
                    </tr>
                `;
            });
        }
    }
    htmlContent += `</table>`;

    // 3. Inject into Hidden Template
    document.getElementById('pdfContent').innerHTML = htmlContent;

    // 4. Capture & Save
    const element = document.getElementById('pdfTemplate');
    html2canvas(element, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${name}_Report.pdf`);
    });
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