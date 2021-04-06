'use strict';
(function() {

    let removeEventListener;
    let filteredColumns = [];

    $(document).ready(function() {
        tableau.extensions.initializeAsync().then(function() {
            const savedSheetName = "D3 DATA (2)"
            // const savedSheetName = 'Partner Display Performance'
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
         for (let i=0; i < worksheets.length; i++){
           console.log(worksheets[i].name)
         }
         worksheet.getSummaryDataAsync().then(function(sumdata) {
             const worksheetData = sumdata;
             console.log(worksheetData)

             let newArr = [];
             var dataJson;
             var cols = [];
             worksheetData.columns.map(d => {
               cols.push(d.fieldName);
             })
             console.log(cols)

             worksheetData.data.map(d => {
                     dataJson = {};
                     for (let i=0; i < cols.length; i++){
                       if (cols[i].includes("SUM(Viewable Impressions)") || cols[i].includes("SUM(Viewable Impressions)")) {
                         dataJson[cols[i]] = !isNaN(d[i].value) ? d[i].value : 0;
                       } else {
                       dataJson[cols[i]] = d[i].value;
                       }
                     }

                     newArr.push(dataJson);


             });



             let sums = {};
             let i;

             for (i = 0; i < newArr.length; i++) {

                 var date = newArr[i]["Week Commencing"]
                 var measured_imp = newArr[i]["SUM(Measured Impressions)"]
                 var view_imp = newArr[i]["SUM(Viewable Impressions)"]
                 var view_rate = newArr[i]["AGG(In-View Rate)"]

                 var measured_date = measured_imp + '_' + date


                if (measured_date in sums) {
                    sums[measured_date]['view_imp'] += view_imp
                    sums[measured_date]['view_rate'] += view_rate

                } else {
                    sums[measured_date] = {
                      "measured_imp": measured_imp,
                      "view_imp": view_imp,
                      "date": date,
                      "view_rate": view_rate
                    }
                }

            }

            var sumsArr = []
            for (const [key, value] of Object.entries(sums))
                sumsArr.push(value)

            sumsArr.sort((a, b) => (a.date > b.date) ? 1 : -1)
            console.log(sumsArr)
            drawDotChart(sumsArr);


        });

        worksheet.getSelectedMarksAsync().then((marks) => {
            demoHelpers.populateDataTable(marks, filterByColumn);
        });

        const marksSelectedEventHandler = (event) => {
            loadSelectedMarks(worksheetName);
        }
        // removeEventListener = worksheet.addEventListener(
        //     tableau.TableauEventType.MarkSelectionChanged, marksSelectedEventHandler);

        removeEventListener = worksheet.addEventListener(
            tableau.TableauEventType.FilterChanged, marksSelectedEventHandler);
    }

    function saveSheetAndLoadSelectedMarks(worksheetName) {
        tableau.extensions.settings.set('sheet', worksheetName);
        tableau.extensions.settings.saveAsync();
        loadSelectedMarks(worksheetName);
        console.log('hi')

    }

    function filterByColumn(columnIndex, fieldName) {
        const columnValues = demoHelpers.getValuesInColumn(columnIndex);
        const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
        const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));
        // console.log(worksheets)
        // console.log(worksheet)

        worksheets[0].applyFilterAsync(fieldName, columnValues, tableau.FilterUpdateType.Replace);

        filteredColumns.push(fieldName);
    }

    function resetFilters() {
        const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));
        filteredColumns.forEach((columnName) => {
            worksheet.clearFilterAsync(columnName);
        });

        filteredColumns = [];
    }


    function drawDotChart(arr) {
        $('#wrapper').empty();
        const dateParser = d3.timeParse("%Y-%m-%d")
        const formatDate = d3.timeFormat("%b %-d, %Y")
        // const formatDate = d3.timeFormat("%b %d")
        const formatDate2 = d3.timeFormat("%b %d")
        const xAccessor = d => dateParser(d.date)
        const yAccessor = d => d.measured_imp
        const y2Accessor = d => d.view_imp
        const view_rate = d => d.view_rate

        const add_commas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");



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

        const wrapper = d3.select("#wrapper")
            .append("svg")
            .attr("width", dimensions.width)
            .attr("height", dimensions.height)

        const bounds = wrapper.append("g")
            .style("transform", `translate(${
           dimensions.margin.left
         }px,${
           dimensions.margin.top
         }px)`)



        const div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

            const xxScale = d3.scaleTime()
                .domain(d3.extent(arr, xAccessor))
                .range([0, dimensions.boundedWidth])

            const xScale = d3.scaleBand()
                .range([0, dimensions.boundedWidth])
                .padding(.99)


        const yScale = d3.scaleLinear()
            .domain(d3.extent(arr, yAccessor))
            .range([dimensions.boundedHeight, 0])
            .nice()

        const y2Scale = d3.scaleLinear()
            .domain(d3.extent(arr, y2Accessor))
            .range([dimensions.boundedHeight, 0])
            // .nice()

        const y3Scale = d3.scaleLinear()
            .domain(d3.extent(arr, view_rate))
            .range([dimensions.boundedHeight, 0])
            // .nice()

        function x_gridlines() {
            return d3.axisBottom(xxScale)
                .ticks(0)
        }

        function y_gridlines() {
            return d3.axisLeft(yScale)
                .ticks(5)
        }

        function y2_gridlines() {
            return d3.axisRight(y2Scale)
                .ticks(0)
        }

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
            // .attr("stroke-dasharray", "4px 4px")
            .call(y2_gridlines()
                .tickSize(dimensions.boundedWidth)
                .tickFormat("")
            )

        const curve = d3.curveLinear



        function mouseOn(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0.95)
            d3.select(this)
                .style("opacity", 1)
            div.html("Impressions: " + d.impressions + "<br/>" + "CTR: " + (d.ctr*10).toFixed(1) + "%")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        };

        function mouseOut(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0);
            d3.select(this)
                .style("opacity", 0.6)
        };

        function mouseOnLine(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0.95)
            d3.select(this)
                .style("opacity", 0.3)
            div.html("Partner:" + "<br/>" + "Impressions: ")
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

        var clip = bounds.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", dimensions.boundedWidth)
            .attr("height", dimensions.boundedHeight)
            .attr("stroke","none")
            .attr("x", 0)
            .attr("y", 0);


        var area = bounds.append("g")
            .attr("class","areas")
            .attr("clip-path", "url(#clip)")

        const path1 = d3.area()
            .x(d => xxScale(xAccessor(d)))
            .y0(yScale(0))
            .y1(d => y2Scale(y2Accessor(d)))
            .curve(curve)


        area.append("path")
            .datum(arr)
            .transition()
            .duration(300)
            .attr("opacity",0)
            .attr("id", "area1")
            .attr("class", "area1")
            .transition()
            .duration(900)
            .attr("fill", "#7e9096")
            .attr("opacity", .9)
            .attr("d", path1)

            const curve2 = d3.curveLinear

            const path2 = d3.area()
                .x(d => xxScale(xAccessor(d)))
                .y0(yScale(0))
                .y1(d => y3Scale(view_rate(d)))
                .curve(curve)

            area.append("path")
                .datum(arr)
                .transition()
                .duration(300)
                .attr("opacity",0)
                .attr("id", "area2")
                .attr("class", "area2")
                .transition()
                .duration(900)
                .attr("fill", "#eee")
                .attr("opacity", .5)
                .attr("d", path2)

            // area.append("path")
            //     .data(arr)
            //     .attr("class", "ctrLine")
            //     .attr("fill", 'none')
            //     .attr("stroke-width", "1px")
            //     .attr("stroke", "white")
            //     .attr("d", line1(arr))



          // area.selectAll("text")
          // .data(arr)
          // .enter()
          // .append("text")
          // .attr("x", d => xxScale(xAccessor(d)))
          // .attr("y", yScale(0))
          // .attr("fill", "white")
          // .attr("font-size", "12px")
          // // .text(function(d) { return d; });
          // .text(d => Math.round(d.view_rate));
          //


        //
        // area.selectAll("line")
        //    .data(arr)
        //    .enter()
        //    .append("line")
        //    .attr("stroke","#1b2326")
        //    .style("opacity",0)
        //    .attr("x1", d => xScale(xAccessor(d)))
        //    .attr("y1", d => yScale(yAccessor(d)))
        //    .attr("x2",d => xScale(xAccessor(d)))
        //    .attr("y2",dimensions.boundedHeight);
        //
        // area.selectAll("line")
        //     .on("mouseover", mouseOnLine)
        //     .on("mouseout", mouseOutLine);




      area.selectAll(".bar")
        .data(arr)
        .enter()
        .append("rect")
        .attr("class","bar")
        .attr("fill", "#5EC7EB")
        .attr("x", d => xxScale(xAccessor(d)))
        .attr("y", d => yScale(yAccessor(d)))
        .attr("height", d=> dimensions.boundedHeight - yScale(yAccessor(d)))
        .attr("width", xScale.bandwidth());

            function highlight(d) {
                    d3.select('.areas')
                    .transition()
                    .duration(500)
                    .style("opacity", 0)
                    d3.select(this).style("opacity", 1)
            };

            function noHighlight(d) {
                d3.select('.areas')
                .transition()
                .duration(500)
                .style("opacity", 1)
            };



        const remove_zero = d => (d / 1e4) + "K";

        const yAxisGenerator = d3.axisLeft()
            .scale(yScale)
            .ticks(4)
            .tickFormat(remove_zero);

        const yAxis = bounds.append("g")
            .attr("class","axisLine")
            .call(yAxisGenerator)
            .attr("font-family", "Arial")
            .attr("font-size", "8")
            .attr("text-align", "left")



        const y2AxisGenerator = d3.axisRight()
            .scale(y2Scale)
            .ticks(0)
            .tickFormat(remove_zero);

        const y2Axis = bounds.append("g")
            .attr("class","axisLine")
            .call(y2AxisGenerator)
            .style("transform", `translateX(${
              dimensions.boundedWidth
            }px)`)
            .attr("font-family", "Arial")
            .attr("opacity","0")
            .attr("font-size", "8")
            .attr("text-align", "left")



        const xAxisGenerator = d3.axisBottom()
            .scale(xxScale)
            .ticks(5)
            .tickFormat(formatDate);


        const xAxis = bounds.append("g")
            .attr("class","axisLine")
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
            .html("Measured Impressions")
            .style("transform", "rotate(-90deg)")
            .style("text-anchor", "middle")
            .style("fill", "white")

        // const y2AxisLabel = y2Axis.append("text")
        //     .attr("x", dimensions.boundedHeight / 2)
        //     .attr("y", -dimensions.margin.right + 10)
        //     .style("font-family", "Arial")
        //     .style("font-size", "10")
        //     .style("font-weight", "bold")
        //     .html("Viewable Impressions")
        //     .style("transform", "rotate(90deg)")
        //     .style("text-anchor", "middle")
        //     .attr("fill", "white")

    }

})();
