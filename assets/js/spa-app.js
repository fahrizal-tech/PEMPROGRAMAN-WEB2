/**
 * SPA Application Logic
 */

// --- Mock Data ---
let students = [
    { id: 'STU-001', name: 'Sarah Jenkins', email: 'sarah.j@university.com', course: 'Intro to UI/UX Design', status: 'Active', avatar: 'fef3c7' },
    { id: 'STU-002', name: 'David Kim', email: 'd.kim@university.com', course: 'Advanced Data Structures', status: 'Active', avatar: 'd1fae5' },
    { id: 'STU-003', name: 'Carlos Menendez', email: 'carlos.m@university.com', course: 'Product Management 101', status: 'Pending', avatar: 'e0e7ff' }
];

let studentToDelete = null;

// --- State Management & Navigation ---
document.addEventListener('DOMContentLoaded', () => {
    // Nav Links
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view-section');

    function switchView(targetId) {
        // Hide all views
        views.forEach(v => v.classList.remove('active'));
        // Remove active class from navs
        navLinks.forEach(n => n.classList.remove('active'));
        
        // Show target view
        document.getElementById(targetId).classList.add('active');
        
        // Find corresponding nav link to set active (skip if view has no direct sidebar link like form)
        const targetNav = Array.from(navLinks).find(n => n.dataset.target === targetId);
        if (targetNav) targetNav.classList.add('active');
        else if(targetId === 'view-form') {
            document.querySelector('[data-target="view-datamaster"]').classList.add('active');
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.dataset.target;
            switchView(target);
        });
    });

    // --- Chart JS Init ---
    const ctx = document.getElementById('enrollmentChart').getContext('2d');
    let gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(29, 78, 216, 0.2)');
    gradient.addColorStop(1, 'rgba(29, 78, 216, 0)');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{
                label: 'Enrollments',
                data: [100, 240, 170, 380, 320, 500, 420],
                borderColor: '#1d4ed8',
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#1d4ed8',
                pointBorderColor: '#fff',
                fill: true, tension: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // --- Data Master Logic ---
    const studentTbody = document.getElementById('student-tbody');
    const statStudents = document.getElementById('stat-students');
    
    function renderTable() {
        studentTbody.innerHTML = '';
        students.forEach((s, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.id}</td>
                <td><div class="user-cell"><img src="https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=${s.avatar}" alt="Avatar"> ${s.name}</div></td>
                <td>${s.email}</td>
                <td>${s.course}</td>
                <td><span class="badge ${s.status.toLowerCase()}">${s.status}</span></td>
                <td>
                    <div class="actions">
                        <button class="action-btn btn-edit" title="Edit (Mock)"><i class="fas fa-pen" style="font-size:12px;"></i></button>
                        <button class="action-btn btn-delete" data-index="${index}"><i class="fas fa-trash" style="font-size:12px;"></i></button>
                    </div>
                </td>
            `;
            studentTbody.appendChild(tr);
        });
        document.getElementById('record-count').innerText = `Showing 1-${students.length} of ${students.length} records`;
        statStudents.innerText = (1242 + students.length).toLocaleString();
        
        // Attach delete listeners
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function() {
                studentToDelete = this.dataset.index;
                document.getElementById('deleteModal').classList.add('active');
            });
        });
    }

    renderTable(); // Initial Render

    // --- Form Logic ---
    document.getElementById('btn-add-student').addEventListener('click', () => {
        document.getElementById('form-id').value = 'STU-00' + (students.length + 1);
        document.getElementById('addForm').reset();
        switchView('view-form');
    });

    document.getElementById('btn-cancel-form').addEventListener('click', () => {
        switchView('view-datamaster');
    });

    document.getElementById('addForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newStudent = {
            id: document.getElementById('form-id').value,
            name: document.getElementById('form-name').value,
            email: document.getElementById('form-email').value,
            course: document.getElementById('form-course').value,
            status: 'Active',
            avatar: 'dbeafe'
        };
        students.push(newStudent);
        renderTable();
        alert('Student registered successfully!');
        switchView('view-datamaster');
    });

    // --- Modal Logic ---
    document.getElementById('btn-cancel-delete').addEventListener('click', () => {
        document.getElementById('deleteModal').classList.remove('active');
        studentToDelete = null;
    });

    document.getElementById('btn-confirm-delete').addEventListener('click', () => {
        if (studentToDelete !== null) {
            students.splice(studentToDelete, 1);
            renderTable();
        }
        document.getElementById('deleteModal').classList.remove('active');
        studentToDelete = null;
    });
});
