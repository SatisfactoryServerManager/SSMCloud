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
