/**
 * Main JavaScript File for LMS Admin Panel
 * Handles UI interactions like Sidebar Toggle and basic validations.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Sidebar Toggle Logic
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (sidebar && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });

    // 2. Add active class to current nav item based on URL
    const currentLocation = location.pathname.split("/").slice(-1)[0];
    const navLinks = document.querySelectorAll('.sidebar-nav li a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentLocation || (currentLocation === '' && href === 'dashboard.html')) {
            link.classList.add('active');
        }
    });
});
