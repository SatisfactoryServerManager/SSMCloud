// SSM Cloud public landing: no-JS gate, scene reveals, hero video, sim boot.
document.documentElement.classList.add("js");

var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initReveal() {
    var scenes = document.querySelectorAll(".scene");
    if (reducedMotion || !("IntersectionObserver" in window)) {
        scenes.forEach(function (s) { s.classList.add("in"); });
        return;
    }
    var io = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    e.target.classList.add("in");
                    io.unobserve(e.target);
                }
            });
        },
        { threshold: 0.25 }
    );
    scenes.forEach(function (s) { io.observe(s); });
}

function initVideo() {
    var video = document.getElementById("hero-video");
    var hero = document.querySelector(".hero");
    if (!video || !hero) return;
    var wide = window.matchMedia("(min-width: 769px)").matches;
    var saveData = navigator.connection && navigator.connection.saveData;
    if (!wide || reducedMotion || saveData) return;

    var src = document.createElement("source");
    src.src = "/public/videos/hero-loop.mp4";
    src.type = "video/mp4";
    video.addEventListener("canplay", function () {
        hero.classList.add("video-on");
        video.play().catch(function () {});
    });
    video.addEventListener("error", function () {
        hero.classList.remove("video-on");
    }, true);
    video.appendChild(src);
    video.load();
}

initReveal();
initVideo();
require("./public-sim").init();
