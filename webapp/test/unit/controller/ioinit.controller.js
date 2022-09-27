/*global QUnit*/

sap.ui.define([
	"zui_io2/controller/ioinit.controller"
], function (Controller) {
	"use strict";

	QUnit.module("ioinit Controller");

	QUnit.test("I should test the ioinit controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
