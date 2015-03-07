var COLORSCALE = ["#1abc9c","#c0392b","#3498db","#9b59b6","#7f8c8d","#d35400","#2ecc71","#34495e","#f39c12","#bdc3c7","#f1c40f","#2c3e50","#e74c3c","#16a085","#95a5a6","#8e44ad","#27ae60","#e67e22","#2980b9"];

function RadvizInterface(radviz,radViews) {
    this.radviz = radviz;
    this.radvizViews = radViews;
    this.tooltip = new Tooltip();
    this.dimensionsElement = $(".sidebar-dimensions-list");
    this.dimensions = [];
    this.dimensionsGroups = [];
    this.dimensionsGroupsElement = $(".sidebar-groups-list");
    this.uniqueDimensionsCount = 0;
    this.uniqueGroupsCount = 0;
    this.uniqueRemovedGroupsCount = 0;
    var _this = this;
    this.radviz.getDimensionNames().forEach(function (item,idx) {
        //addDimension( id : number, name_circle: small name, name_attribute: complete name)
        _this.addDimension(idx,idx,item);
    });
}

RadvizInterface.prototype.getRadviz = function () {
    return this.radviz;
};

RadvizInterface.prototype.getSvg = function () {
    return this.radvizViews.getSvg();
};

RadvizInterface.prototype.getSmallestCircleRadius = function () {
    return this.radvizViews.getSmallestCircleRadius();
};

RadvizInterface.prototype.addDimension = function (id,name,attribute) {
    var dim = {id: id,name: name,attribute: attribute,available: true,group: false,pos: 0};
    this.dimensions[id] = dim;
    this.uniqueDimensionsCount++;
    this.draw();
};

RadvizInterface.prototype.addGroup = function (name,color) {
    var id = this.uniqueGroupsCount;
    var gr = {name: name,color: color,dimensions: [],element: new RadvizDimensionGroup(id,name,color,[])};
    this.dimensionsGroups[id] = gr;
    this.uniqueGroupsCount++;
    this.radvizViews.addDimensionsGroup(gr.element);
    this.draw();
};

RadvizInterface.prototype.removeGroup = function (groupId) {
    groupId = parseInt(groupId);
    this.dimensionsGroups[groupId] = null;
    this.uniqueRemovedGroupsCount++;
    this.radvizViews.removeDimensionsGroup(groupId);
    var _this = this;
    this.dimensions.forEach(function (d,i) {
        if (d.group == groupId) {
            _this.dimensions[i].available = true;
            _this.dimensions[i].group = false;
        }
    });
    if (this.uniqueRemovedGroupsCount == this.uniqueGroupsCount) {
        this.uniqueGroupsCount = 0;
        this.uniqueRemovedGroupsCount = 0;
        this.dimensionsGroups = [];
    }
    this.radviz.setAnchors(this.dimensions);
    this.draw();
};

RadvizInterface.prototype.addDimensionToGroup = function (dimensionId,groupId) {
    dimensionId = parseInt(dimensionId);
    groupId = parseInt(groupId);
    this.dimensions[dimensionId].available = false;
    this.dimensions[dimensionId].group = groupId;
    this.dimensionsGroups[groupId].dimensions.push(dimensionId);
    this.radvizViews.addDimensionToGroup(this.dimensions[dimensionId],groupId);
    this.radviz.setAnchors(this.dimensions);
    this.draw();
};

RadvizInterface.prototype.removeDimensionFromGroup = function (dimensionId) {
    dimensionId = parseInt(dimensionId);
    if (!this.dimensions[dimensionId].available) {
        var oldGroup = this.dimensions[dimensionId].group;
        this.dimensions[dimensionId].available = true;
        this.dimensions[dimensionId].group = false;
        var index = this.dimensionsGroups[oldGroup].dimensions.indexOf(parseInt(dimensionId));
        if (index > -1) {
            this.dimensionsGroups[oldGroup].dimensions.splice(index,1);
            this.radvizViews.removeDimensionFromGroup(dimensionId,oldGroup);
            this.radviz.setAnchors(this.dimensions);
        }
        this.draw();
    }
};

RadvizInterface.prototype.getDimensionPosition = function (dimensionId) {
    var dim = this.dimensions[dimensionId];
    if (dim.available === true) {
        return false;
    } else {
        var groupId = dim.group;
        var pos = dim.pos;
        return {group: groupId,position: pos};
    }
};

RadvizInterface.prototype.draw = function () {
    this.dimensionsElement.children().remove();
    this.dimensionsGroupsElement.children().remove();
    var _this = this;
    this.dimensionsGroups.forEach(function (d,i) {
        if (d) {
            $(".sidebar-groups-list").append("<div data-group-id='" + i + "' class='sidebar-groups-list-item sidebar-groups-list-item-" + i + "' style='background-color: " + d.color + "'>" +
                                             "<div data-group-id='" + i + "' class='sidebar-groups-list-item-element sidebar-groups-list-item-remove'>x</div>" +
                                             "<div class='sidebar-groups-list-item-element sidebar-groups-list-item-title'>" + d.name + "</div></div>");
            d.dimensions.forEach(function (e) {
                $(".sidebar-groups-list-item-" + i).append("<div data-dimension-id='" + e + "' class='sidebar-groups-list-item-element droppable-element'>" + _this.dimensions[e].attribute + "</div>");
            });
        }
    });
    this.dimensions.forEach(function (d,i) {
        if (d.available) {
            $(".sidebar-dimensions-list").append("<div data-dimension-id='" + i + "' class='sidebar-dimensions-list-item droppable-element'>" + d.attribute + "</div>");
        }
    });

    $( ".droppable-element" ).draggable({ revert: "invalid" });
    $( ".sidebar-groups-list-item" ).droppable({
        accept: ".droppable-element",
        activeClass: "ui-state-hover",
        hoverClass: "ui-state-active",
        drop: function( event, ui ) {
            var dimension = ui.draggable.attr("data-dimension-id");
            var group = $(this).attr("data-group-id");
            _this.removeDimensionFromGroup(dimension);
            _this.addDimensionToGroup(dimension,group);
            _this.draw();
        }
    });
    $( ".sidebar-dimensions-list" ).droppable({
        accept: ".droppable-element",
        activeClass: "ui-state-hover",
        hoverClass: "ui-state-active",
        drop: function( event, ui ) {
            var dimension = ui.draggable.attr("data-dimension-id");
            _this.removeDimensionFromGroup(dimension);
            _this.draw();
        }
    });
    $("#btn-add-group").off("click");
    $("#btn-add-group").on("click",function (e) {
        e.preventDefault();
        _this.addGroup("Group " + (_this.uniqueGroupsCount + 1),COLORSCALE[_this.uniqueGroupsCount]);
    });
    $(".sidebar-groups-list-item-remove").off("click");
    $(".sidebar-groups-list-item-remove").on("click",function () {
        _this.removeGroup($(this).attr("data-group-id"));
    });
};

RadvizInterface.prototype.drawPoints = function () {
    var smallestCircle = this.getSmallestCircleRadius();

    var xValue = function (d) {
        return d.x;
    };
    var xScale = d3.scale.linear().range([-smallestCircle, smallestCircle]).domain([-1, 1]);//input domain, output range
    var xMap = function (d) {
        return xScale(xValue(d));
    };
    var yValue = function (d) {
        return d.y;
    };
    var yScale = d3.scale.linear().range([-smallestCircle, smallestCircle]).domain([-1, 1]);//input domain, output range
    var yMap = function (d) {
        return yScale(yValue(d));
    };


    radInterface.getSvg().selectAll(".dot")
        .data(this.radviz.computeProjection())
        .enter().append("circle")
        .attr("class", "dot")
        .attr("r", 3.5)
        .attr("cx", xMap)
        .attr("cy", yMap)
        .on("mouseover", function (d) {
            if (d.tip) {
                this.tooltip.show(d.tip);
            }
        })
        .on("mouseout", function (d) {
            if (d.tip) {
                this.tooltip.hide();
            }
        });
};