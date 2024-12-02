const template = `
<nav class="navbar navbar-expand-lg navbar-light mb-3" id="navBarId">
    <div class="container-fluid">
        <a class="navbar-brand" href="#">Bitmap Compression Visualizer</a>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav"
            aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav ms-auto">
                <li class="nav-item">
                    <a class="nav-link" href="home.html">Home</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="animation.html">Animation</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="diff_checker.html">Diff Checker</a>
                </li>
            </ul>
            <!-- Dark Mode Toggle Button -->
            <button id="dark-mode-toggle" class="btn ms-3">
                <svg id="sun-image" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-brightness-high-fill" viewBox="0 0 16 16">
                    <path d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/>
                </svg>
                <svg id="moon-image" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-moon-fill" viewBox="0 0 16 16">
                    <path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278"/>
                </svg>
            </button>
        </div>
    </div>
</nav>
`

class NavBar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = template;
        this.setActiveLink();
        this.setupThemeToggle();
    }

    setActiveLink() {
        const activeLink = this.getAttribute('active-link');
        const links = document.querySelectorAll('.nav-link');
        links.forEach(link => {
            if (link.getAttribute('href') == activeLink) {
                link.classList.add('active');
            }
        })
    }

    lightModeAction() {
        const sunImage = document.querySelector('#sun-image');
        const moonImage = document.querySelector('#moon-image');
        const navbar = document.getElementById('navBarId');
        navbar.classList.remove('navbar-dark');
        navbar.classList.add('navbar-light');
        moonImage.style.display = "block";
        sunImage.style.display = "none";
    }

    darkModeAction() {
        const sunImage = document.querySelector('#sun-image');
        const moonImage = document.querySelector('#moon-image');
        const navbar = document.getElementById('navBarId');
        navbar.classList.remove('navbar-light');
        navbar.classList.add('navbar-dark');
        moonImage.style.display = "none";
        sunImage.style.display = "block";
    }

    toggleTheme() {

    }

    setupThemeToggle() {
        const themeToggleButton = document.querySelector('#dark-mode-toggle');
        const body = document.body;
        const theme = localStorage.getItem('theme');
        if (theme != null && theme == 'dark') {
            localStorage.setItem('theme', 'dark');
            this.darkModeAction();
        }
        else {
            localStorage.setItem('theme', 'light');
            this.lightModeAction();
        }

        themeToggleButton.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                this.darkModeAction();
            }
            else {
                localStorage.setItem('theme', 'light');
                this.lightModeAction();
            }
        });

        // Load the user's preference on page load
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            body.classList.add('dark-mode');
        }
    }
}

customElements.define("nav-bar", NavBar)
