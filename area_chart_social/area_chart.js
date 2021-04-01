'use strict';
(function() {

    let removeEventListener;
    let filteredColumns = [];

    $(document).ready(function() {
        tableau.extensions.initializeAsync().then(function() {
            // worksheet we're reading data from
            const savedSheetName = "D3 DATA (2)"
            loadSelectedMarks(savedSheetName);

        }, function(err) {
            // Something went wrong in initialization.
            console.log('Error while Initializing: ' + err.toString());
        });
    });


    function loadSelectedMarks(worksheetName) {
        if (removeEventListener) {
            removeEventListener();
        }

        const worksheet = demoHelpers.getSelectedSheet(worksheetName);
        const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
        for (let i = 0; i < worksheets.length; i++) {
            console.log(worksheets[i].name)
        }
        // This function gets the summary data table for the selected worksheet
        worksheet.getSummaryDataAsync().then(function(sumdata) {
            const worksheetData = sumdata;

            let newArr = [];
            var dataJson;
            var cols = [];

            // create an array of data columns to gather fieldnames
            worksheetData.columns.map(d => {
                cols.push(d.fieldName);
            })

            worksheetData.data.map(d => {
                dataJson = {};
                // Some values are null or NaN, so we give them a 0 value
                for (let i = 0; i < cols.length; i++) {
                    if (cols[i].includes("AGG(Social Engagement Rate)")) {
                        dataJson[cols[i]] = !isNaN(d[i].value) ? d[i].value : 0;
                    } else {
                        dataJson[cols[i]] = d[i].value;
                    }
                }

                // Filter down partners to the ones we want to show in the chart
                if (dataJson['Partner'] == ['facebook'] ||
                    dataJson['Partner'] == ['instagram'] ||
                    dataJson['Partner'] == ['unknown'] ||
                    dataJson['Partner'] == ['Hearst Corp']) {
                    newArr.push(dataJson);
                }


            });

            let sums = {};
            let i;
            for (i = 0; i < newArr.length; i++) {

                // assign new names to fieldnames
                var impressions = newArr[i]["SUM(Impressions)"]
                var clicks = newArr[i]["SUM(Clicks)"]
                var ctr = newArr[i]["AGG(3. CTR)"]
                var date = newArr[i]["Week Commencing"]
                var partner = newArr[i]["Partner"]
                var video_type = newArr[i]["Video Type"]
                var vcr = newArr[i]["AGG(4. VCR)"]
                var video_plays = newArr[i]["SUM(Video Plays)"]
                var measured_impressions = newArr[i]["SUM(Measured Impressions)"]
                var client = newArr[i]["Client "]
                var eng_rate = newArr[i]["AGG(Social Engagement Rate)"]

                // add all impressions or ctr..... together in sums if they have the same partner and date
                var partner_date = partner + '_' + date

                if (partner_date in sums) {
                    sums[partner_date]['impressions'] += impressions
                    sums[partner_date]['ctr'] += ctr
                    sums[partner_date]['clicks'] += clicks
                    sums[partner_date]['eng_rate'] += eng_rate

                } else {
                    sums[partner_date] = {
                        "impressions": impressions,
                        "ctr": ctr,
                        "clicks": clicks,
                        "eng_rate": eng_rate,
                        "partner": partner,
                        "date": date
                    }
                }
            }

            // change sums format from {} to []
            var sumsArr = []
            for (const [key, value] of Object.entries(sums))
                sumsArr.push(value)

            // sort array by date
            sumsArr.sort((a, b) => (a.date > b.date) ? 1 : -1)


            // calling the function that draws the chart
            drawDotChart(sumsArr);


        });

        worksheet.getSelectedMarksAsync().then((marks) => {
            demoHelpers.populateDataTable(marks, filterByColumn);
        });

        const marksSelectedEventHandler = (event) => {
            loadSelectedMarks(worksheetName);
        }

        // This allows the chart to respond to Tableau filters
        removeEventListener = worksheet.addEventListener(
            tableau.TableauEventType.FilterChanged, marksSelectedEventHandler);
    }

    function saveSheetAndLoadSelectedMarks(worksheetName) {
        tableau.extensions.settings.set('sheet', worksheetName);
        // attempts to persist any currently modified settings key-value pairs
        tableau.extensions.settings.saveAsync();
        loadSelectedMarks(worksheetName);

    }

    // apply filters after visualization has loaded
    function filterByColumn(columnIndex, fieldName) {
        const columnValues = demoHelpers.getValuesInColumn(columnIndex);
        const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
        const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));

        worksheets[0].applyFilterAsync(fieldName, columnValues, tableau.FilterUpdateType.Replace);

        filteredColumns.push(fieldName);
    }

    // clearing a filter
    function resetFilters() {
        const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));
        filteredColumns.forEach((columnName) => {
            worksheet.clearFilterAsync(columnName);
        });

        filteredColumns = [];
    }

    // drawing the chart in d3js
    function drawDotChart(arr) {
        $('#wrapper').empty();

        // Date (xAxis)
        const dateParser = d3.timeParse("%Y-%m-%d")
        const formatDate = d3.timeFormat("%b %-d, %Y")
        const formatDate2 = d3.timeFormat("%b %d")
        const xAccessor = d => dateParser(d.date)
        // Impressions (yAxis) -- Left Axis
        const yAccessor = d => d.impressions
        // Engagement Rate (yAxis) -- Right Axis
        const y2Accessor = d => d.eng_rate
        const partners = d => d.partner
        // formatting numbers
        const add_commas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        // Average engagement rate line
        const average_y2 = d => d3.mean(arr, y2Accessor).toFixed(2);

        // Since we want to show 4 seperate areas, each partner will have its own array
        var arr_1 = []
        var arr_2 = []
        var arr_3 = []
        var arr_4 = []
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].partner == 'facebook') {
                arr_1.push(arr[i])
            } else if (arr[i].partner == 'instagram') {
                arr_2.push(arr[i])
            } else if (arr[i].partner == 'Hearst Corp') {
                arr_3.push(arr[i])
            } else if (arr[i].partner == 'unknown') {
                arr_4.push(arr[i])
            }
        }


        // Legend work as checkboxes too, here we conect html input tags with the chart using an event listener
        if (document.querySelector('input[name="check"]')) {
            document.querySelectorAll('input[name="check"]').forEach((elem) => {
                elem.addEventListener("change", function() {
                    var check_1 = document.getElementById("check_1");
                    var check_2 = document.getElementById("check_2");
                    var check_3 = document.getElementById("check_3");
                    var check_4 = document.getElementById("check_4");
                    var area1 = document.getElementById("area1");
                    var area2 = document.getElementById("area2");
                    var area3 = document.getElementById("area3");
                    var area4 = document.getElementById("area4");

                    if (check_1.checked == false) {
                        area1.style.opacity = "0";
                        area1.style.transition = "opacity .7s linear";
                    }
                    if (check_2.checked == false) {
                        area2.style.opacity = "0";
                        area2.style.transition = "opacity .7s linear";

                    }
                    if (check_3.checked == false) {
                        area3.style.opacity = "0";
                        area3.style.transition = "opacity .7s linear";

                    }
                    if (check_1.checked == true) {
                        area1.style.opacity = ".9";
                        area1.style.transition = "visibility 0s .7s, opacity .7s linear";
                    }
                    if (check_2.checked == true) {
                        area2.style.opacity = ".9";
                        area2.style.transition = "visibility 0s .7s, opacity .7s linear";
                    }
                    if (check_3.checked == true) {
                        area3.style.opacity = ".9";
                        area3.style.transition = "visibility 0s .7s, opacity .7s linear";
                    }
                    if (check_4.checked == true) {
                        area4.style.opacity = ".9";
                        area4.style.transition = "visibility 0s .7s, opacity .7s linear";
                    }
                });
            });
        }

        // setting up chart dmension to make it responsive
        const width = d3.min([
            window.innerWidth * 0.95,
        ])
        const height = d3.min([
            window.innerHeight * 0.85,
        ])


        let dimensions = {
            width: width,
            height: height,
            margin: {
                top: 10,
                right: 50,
                bottom: 30,
                left: 50,
            },
        }
        dimensions.boundedWidth = dimensions.width -
            dimensions.margin.right -
            dimensions.margin.left
        dimensions.boundedHeight = dimensions.height -
            dimensions.margin.top -
            dimensions.margin.bottom

        // first space we create is an svg element
        const wrapper = d3.select("#wrapper")
            .append("svg")
            .attr("width", dimensions.width)
            .attr("height", dimensions.height)

        // second we create another space for the chart
        const bounds = wrapper.append("g")
            .style("transform", `translate(${
           dimensions.margin.left
         }px,${
           dimensions.margin.top
         }px)`)

        // div for bubbles when mouse is on something
        const div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        // scaleTime understands day, month...etc
        // d3.extent is used to return the minimum and maximum value in an array from the given array using natural order
        // here we're mapping data values into the chart's width

        const xScale = d3.scaleTime()
            .domain(d3.extent(arr, xAccessor))
            .range([0, dimensions.boundedWidth])

        const yScale = d3.scaleLinear()
            .domain(d3.extent(arr, yAccessor))
            .range([dimensions.boundedHeight, 0])
            .nice()

        const y2Scale = d3.scaleLinear()
            .domain(d3.extent(arr, y2Accessor))
            .range([dimensions.boundedHeight, 0])


        // d3.axisBottom(scale) constructs a new bottom-oriented axis generator for the given scale
        // d3.axisLeft(scale) constructs a new left-oriented axis generator for the given scale
        // d3.axisLRight(scale) constructs a new right-oriented axis generator for the given scale

        function x_gridlines() {
            return d3.axisBottom(xScale)
                .ticks(0)
        }

        function y_gridlines() {
            return d3.axisLeft(yScale)
                .ticks(10)
        }

        function y2_gridlines() {
            return d3.axisRight(y2Scale)
                .ticks(0)
        }

        // chart background gridlines
        bounds.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + dimensions.boundedHeight + ")")
            .call(x_gridlines()
                .tickSize(-dimensions.boundedHeight)
                .tickFormat("")
            )

        bounds.append("g")
            .attr("class", "grid")
            .call(y_gridlines()
                .tickSize(-dimensions.boundedWidth)
                .tickFormat("")
            )

        bounds.append("g")
            .attr("class", "grid_y2")
            .call(y2_gridlines()
                .tickSize(dimensions.boundedWidth)
                .tickFormat("")
            )


        function mouseOnLine(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0.95)
            d3.select(this)
                .style("opacity", 0.3)
            div.html("Partner:" + d.partner + "<br/>" + "Impressions: " + d.impressions)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        };

        function mouseOutLine(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0);
            d3.select(this)
                .style("opacity", 0);
        };


        // create a frame/mask to crop the chart when zoming-in (for the brush feature)
        var clip = bounds.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", dimensions.boundedWidth)
            .attr("height", dimensions.boundedHeight)
            .attr("stroke", "none")
            .attr("x", 0)
            .attr("y", 0);

        // brush feature (select an area in the chart to zoom-in)
        var brush = d3.brushX()
            .extent([
                [0, 0],
                [dimensions.boundedWidth, dimensions.boundedHeight]
            ])
            .on("end", updateChart)

        // craete one group for all the "marks"
        var area = bounds.append("g")
            .attr("class", "areas")
            .attr("clip-path", "url(#clip)")

        const curve = d3.curveLinear

        // First area (partner)
        const path1 = d3.area()
            .x(d => xScale(xAccessor(d)))
            .y0(yScale(0))
            .y1(d => yScale(yAccessor(d)))
            .curve(curve)

        // appending path to draw the area charset
        // transition and duration animate the path in and out
        area.append("path")
            .datum(arr_1)
            .transition()
            .duration(300)
            .attr("opacity", 0)
            .attr("id", "area1")
            .attr("class", "area1")
            .transition()
            .duration(900)
            .attr("fill", "#5EC7EB")
            .attr("opacity", .9)
            .attr("d", path1)

        area
            .append("g")
            .attr("class", "brush")
            .call(brush);

        const path2 = d3.area()
            .x(d => xScale(xAccessor(d)))
            .y0(yScale(0))
            .y1(d => yScale(yAccessor(d)))
            .curve(curve)

        area.append("path")
            .datum(arr_2)
            .transition()
            .duration(600)
            .attr("opacity", 0)
            .attr("id", "area2")
            .attr("class", "area2")
            .transition()
            .duration(800)
            .attr("fill", "#4e79a7")
            .attr("opacity", .9)
            .attr("d", path2)

        // when mouse is on a path, show a line with a bubble of the data point
        area.selectAll("line")
            .data(arr)
            .enter()
            .append("line")
            .attr("stroke", "#1b2326")
            .attr("stroke-width", "1px")
            .style("opacity", 0)
            .attr("x1", d => xScale(xAccessor(d)))
            .attr("y1", d => yScale(yAccessor(d)))
            .attr("x2", d => xScale(xAccessor(d)))
            .attr("y2", dimensions.boundedHeight);

        area.selectAll("line")
            .on("mouseover", mouseOnLine)
            .on("mouseout", mouseOutLine);

        const path3 = d3.area()
            .x(d => xScale(xAccessor(d)))
            .y0(yScale(0))
            .y1(d => yScale(yAccessor(d)))
            .curve(curve)

        area.append("path")
            .datum(arr_3)
            .transition()
            .duration(800)
            .attr("opacity", 0)
            .attr("id", "area3")
            .attr("class", "area3")
            .transition()
            .duration(800)
            .attr("fill", '#FF8500')
            .attr("opacity", 0.8)
            .attr("d", path3)

        const path4 = d3.area()
            .x(d => xScale(xAccessor(d)))
            .y0(yScale(0))
            .y1(d => yScale(yAccessor(d)))
            .curve(curve)

        area.append("path")
            .datum(arr_4)
            .transition()
            .duration(800)
            .attr("opacity", 0)
            .attr("id", "area4")
            .attr("class", "area4")
            .transition()
            .duration(800)
            .attr("fill", '#DAF7A6')
            .attr("opacity", 0.8)
            .attr("d", path4)


        // Right axis line chart
        const curve2 = d3.curveLinear

        const line1 = d3.line()
            .x(d => xScale(xAccessor(d)))
            .y(d => y2Scale(y2Accessor(d)))
            .curve(curve2)

        // passing arr because we want to show the engagement rate of all 4 partners
        area.append("path")
            .data(arr)
            .attr("class", "ctrLine")
            .attr("fill", 'none')
            .attr("stroke-width", "1px")
            .attr("stroke", "white")
            .attr("d", line1(arr))

        // Engagement rate average line
        const avgLine_y = bounds.append("line")
            .attr("y1", d => y2Scale(average_y2(d)))
            .attr("y2", d => y2Scale(average_y2(d)))
            .attr("x1", 0)
            .attr("x2", dimensions.boundedWidth)
            .attr("stroke", "#D93251")
            .attr("stroke-width", "2px")
            .attr("weight", 3)
            .attr("stroke-dasharray", "5px 5px")

        const avgLabel_y = bounds.append("text")
            .attr("y", d => y2Scale(average_y2(d)) - 5)
            .attr("x", 10)
            .style("font-weight", "bold")
            .text("Avg Engagement Rate:")
            .attr("fill", "white")
            .style("font-size", "10px")
            .attr("font-family", "Arial")

        const avgLabel_y_2 = bounds
            .append("g")
        avgLabel_y_2
            .selectAll("text")
            .data(arr)
            .enter()
            .append("text")
            .text(d => (average_y2(d) * 10).toFixed(1) + "%")
            .attr("y", d => y2Scale(average_y2(d)) + 15)
            .attr("x", 10)
            .style("font-size", "10px")
            .attr("font-family", "Arial")
            .attr("fill", "white")


        // brush feature and zooming-in
        var idleTimeout

        function idled() {
            idleTimeout = null;
        }

        function updateChart() {
            // What are the selected boundaries?
            var extent = d3.event.selection
            // If no selection, back to initial coordinate. Otherwise, update X axis domain
            if (!extent) {
                if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
                xScale.domain([4, 8])
            } else {
                xScale.domain([xScale.invert(extent[0]), xScale.invert(extent[1])])
                area.select(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
            }
            // Update axis and area position
            xAxis.transition().duration(1000).call(
                d3.axisBottom(xScale)
                .ticks(9)
                .tickFormat(formatDate2))

            area
                .select('.area1')
                .transition()
                .duration(1000)
                .attr("d", path1)
            area
                .select('.area2')
                .transition()
                .duration(1000)
                .attr("d", path2)
            area
                .select('.area3')
                .transition()
                .duration(1000)
                .attr("d", path3)
            area
                .select('.area4')
                .transition()
                .duration(1000)
                .attr("d", path4)
            area
                .select('.ctrLine')
                .transition()
                .duration(1000)
                .attr("d", line1(arr))
        }

        bounds.on("dblclick", function() {
            xScale.domain(d3.extent(arr, xAccessor))
            xAxis.transition().call(d3.axisBottom(xScale)
                .ticks(9)
                .tickFormat(formatDate))
            area
                .select('.area1')
                .transition()
                .attr("d", path1)
            area
                .select('.area2')
                .transition()
                .attr("d", path2)
            area
                .select('.area3')
                .transition()
                .attr("d", path3)
            area
                .select('.area4')
                .transition()
                .attr("d", path4)
            area
                .select('.ctrLine')
                .transition()
                .attr("d", line1(arr))
        });

        const remove_zero = d => (d / 1e6) + "M";

        // add axis ticks
        const yAxisGenerator = d3.axisLeft()
            .scale(yScale)
            .ticks(5)
            .tickFormat(remove_zero);

        const yAxis = bounds.append("g")
            .attr("class", "axisLine")
            .call(yAxisGenerator)
            .attr("font-family", "Arial")
            .attr("font-size", "8")
            .attr("text-align", "left")

        const y2AxisGenerator = d3.axisRight()
            .scale(y2Scale)
            .ticks(5)
            .tickFormat(d => (d * 10) + "%");

        const y2Axis = bounds.append("g")
            .attr("class", "axisLine")
            .call(y2AxisGenerator)
            .style("transform", `translateX(${
              dimensions.boundedWidth
            }px)`)
            .attr("font-family", "Arial")
            .attr("font-size", "8")
            .attr("text-align", "left")


        const xAxisGenerator = d3.axisBottom()
            .scale(xScale)
            .ticks(9)
            .tickFormat(formatDate);

        const xAxis = bounds.append("g")
            .attr("class", "axisLine")
            .call(xAxisGenerator)
            .style("transform", `translateY(${
        dimensions.boundedHeight
      }px)`)
            .attr("font-family", "Arial")
            .attr("font-size", "8")

        const xAxisLabel = xAxis.append("text")
            .attr("x", dimensions.boundedWidth / 2)
            .attr("y", dimensions.margin.bottom)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("")
            .attr("fill", "white")

        const yAxisLabel = yAxis.append("text")
            .attr("x", -dimensions.boundedHeight / 2)
            .attr("y", -dimensions.margin.left + 10)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("Impressions")
            .style("transform", "rotate(-90deg)")
            .style("text-anchor", "middle")
            .style("fill", "white")

        const y2AxisLabel = y2Axis.append("text")
            .attr("x", dimensions.boundedHeight / 2)
            .attr("y", -dimensions.margin.right + 10)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("Engagement Rate")
            .style("transform", "rotate(90deg)")
            .style("text-anchor", "middle")
            .attr("fill", "white")
    }
})();
