document.addEventListener("DOMContentLoaded", function () {

    loadHeader();
    loadFooter();

});


/* =========================================
   LOAD HEADER
========================================= */

async function loadHeader() {

    const headerContainer = document.getElementById("header");

    if (!headerContainer) {
        console.error("ERROR: #header element was not found.");
        return;
    }

    try {

        const response = await fetch("./components/header.html");

        if (!response.ok) {
            throw new Error(
                "Could not load header.html. HTTP status: " +
                response.status
            );
        }

        const html = await response.text();

        headerContainer.innerHTML = html;

        console.log("Header loaded successfully.");

        initHeader();

    } catch (error) {

        console.error("HEADER ERROR:", error);

    }

}


/* =========================================
   HEADER / MOBILE MENU
========================================= */

function initHeader() {

    const menuBtn = document.getElementById("menuBtn");
    const closeDrawer = document.getElementById("closeDrawer");
    const drawer = document.getElementById("mobileDrawer");
    const overlay = document.getElementById("drawerOverlay");

    if (!menuBtn || !closeDrawer || !drawer || !overlay) {

        console.error("Header menu elements not found.");

        return;

    }


    function openDrawer() {

        drawer.classList.remove("translate-x-full");

        overlay.classList.remove(
            "opacity-0",
            "pointer-events-none"
        );

        overlay.classList.add("opacity-100");

        document.body.classList.add("overflow-hidden");

    }


    function closeDrawerMenu() {

        drawer.classList.add("translate-x-full");

        overlay.classList.add(
            "opacity-0",
            "pointer-events-none"
        );

        overlay.classList.remove("opacity-100");

        document.body.classList.remove("overflow-hidden");

    }


    menuBtn.addEventListener(
        "click",
        openDrawer
    );


    closeDrawer.addEventListener(
        "click",
        closeDrawerMenu
    );


    overlay.addEventListener(
        "click",
        closeDrawerMenu
    );


    document.querySelectorAll(".drawer-link").forEach(function (link) {

        link.addEventListener(
            "click",
            closeDrawerMenu
        );

    });


    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Escape") {

                closeDrawerMenu();

            }

        }
    );

}


/* =========================================
   LOAD FOOTER
========================================= */

async function loadFooter() {

    const footerContainer = document.getElementById("footer");

    if (!footerContainer) {

        console.error("ERROR: #footer element was not found.");

        return;

    }

    try {

        const response = await fetch("./components/footer.html");

        if (!response.ok) {

            throw new Error(
                "Could not load footer.html. HTTP status: " +
                response.status
            );

        }

        const html = await response.text();

        footerContainer.innerHTML = html;

        const year = footerContainer.querySelector("#footer-year");

        if (year) {

            year.textContent =
                new Date().getFullYear();

        }

        console.log("Footer loaded successfully.");

    } catch (error) {

        console.error("FOOTER ERROR:", error);

    }

}
