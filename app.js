// --- LICENSE SYSTEM ---

// 1. Check License on Startup
checkLicense();

function checkLicense() {
    const expiry = localStorage.getItem('pratnya_license_expiry');
    const lockScreen = document.getElementById('licenseScreen');
    
    // If no date found OR date has passed
    if (!expiry || new Date() > new Date(expiry)) {
        lockScreen.style.display = 'flex'; // Show Lock
        document.body.style.overflow = 'hidden'; // Stop scrolling
    } else {
        lockScreen.style.display = 'none'; // Unlock App
        document.body.style.overflow = 'auto';
    }
}

// 2. Activate License (When user enters key)
window.activateLicense = function() {
    const input = document.getElementById('licenseKeyInput').value.trim();
    const errorMsg = document.getElementById('licenseError');

    try {
        // Decode the key (Base64)
        const decoded = atob(input); // format: "PRATNYA-SECRET|2027-02-05"
        const parts = decoded.split('|');

        if (parts[0] !== "PRATNYA-SECRET") {
            throw new Error("Invalid Key");
        }

        const expiryDate = new Date(parts[1]);
        if (isNaN(expiryDate.getTime())) {
            throw new Error("Invalid Date");
        }

        // Save to phone
        localStorage.setItem('pratnya_license_expiry', parts[1]);
        
        // Unlock
        Swal.fire({
            title: 'Activated!',
            text: 'Subscription active until ' + parts[1],
            icon: 'success'
        }).then(() => {
            location.reload();
        });

    } catch (e) {
        errorMsg.style.display = 'block';
        errorMsg.innerText = "Invalid Key. Please contact Admin.";
    }
};

// 3. Initialize Database
const db = new Dexie('AstroAppDB');
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

// 1. Show/Close Form
function showForm() {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; 
}

function closeForm() {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    form.reset();
    document.getElementById('clientId').value = "";
    document.getElementById('historyList').innerHTML = "<p style='color:#888; text-align:center;'>No previous history</p>";
}

// 2. SAVE CLIENT
form.onsubmit = async (event) => {
    event.preventDefault();
    
    // Get Data
    const id = document.getElementById('clientId').value;
    const basicData = {
        name: document.getElementById('name').value,
        star: document.getElementById('star').value,
        dob: document.getElementById('dob').value,
        age: document.getElementById('age').value,
        birthTime: document.getElementById('birthTime').value,
        location: document.getElementById('place').value,
        phone: document.getElementById('phone').value,
        profession: document.getElementById('profession').value,
        updated: new Date()
    };

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

    // Save to DB
    if (id) {
        const client = await db.clients.get(parseInt(id));
        let history = client.consultations || [];
        if (consultationEntry) history.unshift(consultationEntry);
        await db.clients.update(parseInt(id), { ...basicData, consultations: history });
    } else {
        const history = consultationEntry ? [consultationEntry] : [];
        await db.clients.add({ ...basicData, consultations: history });
    }

    // UI Cleanup
    closeForm();
    await updateList();

    // Small Success Popup
    Swal.fire({
        title: 'Saved!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        width: '250px',
        padding: '15px'
    });
};

// 3. LOAD CLIENT
window.loadClient = async (id) => {
    const client = await db.clients.get(id);
    if(!client) return;

    document.getElementById('clientId').value = client.id;
    document.getElementById('name').value = client.name;
    document.getElementById('star').value = client.star || "";
    document.getElementById('dob').value = client.dob || "";
    document.getElementById('age').value = client.age || "";
    document.getElementById('birthTime').value = client.birthTime || "";
    document.getElementById('place').value = client.location || "";
    document.getElementById('phone').value = client.phone || "";
    document.getElementById('profession').value = client.profession || "";

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

// 4. DISPLAY LIST
async function updateList() {
    const query = searchInput.value.toLowerCase();
    let clients = await db.clients.toArray();

    if (query) {
        clients = clients.filter(c => c.name.toLowerCase().includes(query));
    }
    clients.reverse();

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

// 5. GENERATE PDF (With Small "Generating" Popup)
window.generatePDF = async () => {
    // 1. Show "Generating..." Spinner immediately
    Swal.fire({
        title: 'Generating PDF...',
        icon: 'info',
        width: '250px',
        padding: '15px',
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // Short wait to ensure spinner renders
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        if (!window.jspdf || !window.html2canvas) throw new Error("Libraries not loaded");

        const { jsPDF } = window.jspdf;
        
        // Gather Data
        const name = document.getElementById('name').value;
        const star = document.getElementById('star').value;
        const dob = document.getElementById('dob').value;
        const time = document.getElementById('birthTime').value;

        // Format Time
        let displayTime = time;
        if(time) {
            const [h, m] = time.split(':');
            const hour = parseInt(h);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            displayTime = `${hour12}:${m} ${ampm}`;
        }

        // Build HTML
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

        document.getElementById('pdfContent').innerHTML = htmlContent;

        // Generate PDF
        const element = document.getElementById('pdfTemplate');
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${name}_Report.pdf`);

        // Change to Success Popup
        Swal.fire({
            title: 'Downloaded!',
            icon: 'success',
            width: '250px',
            timer: 1500,
            showConfirmButton: false
        });

    } catch (error) {
        console.error(error);
        Swal.fire({ title: 'Error', text: 'PDF Failed', icon: 'error', width: '250px' });
    }
};

// 6. DELETE CLIENT
async function deleteCurrentClient() {
    const id = document.getElementById('clientId').value;

    if (!id) {
        Swal.fire({ title: 'Error', text: 'No client selected', icon: 'error', width: '250px' });
        return;
    }

    Swal.fire({
        title: 'Delete Client?',
        text: "Cannot undo!",
        icon: 'warning',
        width: '280px',
        padding: '10px',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes',
        cancelButtonText: 'No'
    }).then(async (result) => {
        if (result.isConfirmed) {
            await db.clients.delete(parseInt(id));
            closeForm();
            await updateList();
            Swal.fire({
                title: 'Deleted!',
                icon: 'success',
                width: '250px',
                timer: 1500,
                showConfirmButton: false
            });
        }
    });
}

// Listeners
searchInput.oninput = () => updateList();

function calculateAge() {
    const dobInput = document.getElementById('dob').value;
    if (!dobInput) return;
    const dob = new Date(dobInput);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    document.getElementById('age').value = age;
}