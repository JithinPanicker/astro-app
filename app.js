// 1. Initialize Dexie Database
const db = new Dexie('AstroAppDB');
db.version(1).stores({
    clients: '++id, name, star, phone, notes' // ++id means auto-incrementing ID
});

// 2. DOM Elements
const form = document.getElementById('clientForm');
const listDiv = document.getElementById('clientList');
const searchInput = document.getElementById('searchInput');

// 3. Load Clients on Startup
updateList();

// 4. SAVE (Add or Update)
form.onsubmit = async (event) => {
    event.preventDefault();
    
    const id = document.getElementById('clientId').value;
    const name = document.getElementById('name').value;
    const star = document.getElementById('star').value;
    const phone = document.getElementById('phone').value;
    const notes = document.getElementById('notes').value;

    if (id) {
        // Update existing
        await db.clients.update(parseInt(id), { name, star, phone, notes });
    } else {
        // Add new
        await db.clients.add({ name, star, phone, notes });
    }

    form.reset();
    document.getElementById('clientId').value = ""; // Clear ID
    updateList(); // Refresh list
};

// 5. READ & DISPLAY (With Search)
async function updateList() {
    const query = searchInput.value.toLowerCase();
    
    // Get all clients from DB
    let clients = await db.clients.toArray();

    // Filter if searching
    if (query) {
        clients = clients.filter(c => c.name.toLowerCase().includes(query));
    }

    // Sort: Newest first (by ID desc)
    clients.reverse();

    // Render HTML
    listDiv.innerHTML = clients.map(client => `
        <div class="client-item">
            <div>
                <strong>${client.name}</strong><br>
                <small>⭐ ${client.star || 'Unknown'}</small>
            </div>
            <div class="actions">
                <button class="btn-edit" onclick="loadClient(${client.id})">Edit</button>
                <button class="btn-delete" onclick="deleteClient(${client.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// 6. DELETE
window.deleteClient = async (id) => {
    if(confirm("Delete this client?")) {
        await db.clients.delete(id);
        updateList();
    }
};

// 7. EDIT (Load data back into form)
window.loadClient = async (id) => {
    const client = await db.clients.get(id);
    document.getElementById('clientId').value = client.id;
    document.getElementById('name').value = client.name;
    document.getElementById('star').value = client.star;
    document.getElementById('phone').value = client.phone;
    document.getElementById('notes').value = client.notes;
    
    // Scroll to top
    window.scrollTo(0,0);
};

// 8. Search Listener
searchInput.oninput = () => updateList();