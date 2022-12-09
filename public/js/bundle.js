(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
function main() {
    $(".circle").each((index, el) => {
        const $el = $(el);
        console.log($el);

        const percentValue = $el.attr("data-percent");

        $el.circleProgress({
            startAngle: (-Math.PI / 4) * 2,
            value: percentValue / 100,
            size: 150,
            lineCap: "round",
            emptyFill: "rgba(255, 255, 255, .1)",
            fill: {
                color: "#ffa500",
            },
        }).on(
            "circle-animation-progress",
            function (event, progress, stepValue) {
                $(this)
                    .find("strong")
                    .text(`${(stepValue.toFixed(2) * 100).toFixed(0)}%`);
            }
        );
    });
}

$(document).ready(() => {
    main();
});

},{}]},{},[1]);
