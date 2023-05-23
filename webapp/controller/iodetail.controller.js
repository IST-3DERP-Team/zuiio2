sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    "../js/Common",
    "../js/Utils",
    "../js/Constants",
    "sap/ui/model/json/JSONModel",
    'jquery.sap.global',
    'sap/ui/core/routing/HashChanger',
    'sap/m/MessageStrip',
    "../control/DynamicTable",
    "./fragments/FASummary",
    "sap/m/MessageBox",
    "sap/ui/core/routing/History",
    "sap/m/UploadCollectionParameter",
],
    /** 
     * @param {typeof sap.ui.core.mvc.Controller} Controller 
     */
    function (Controller, Filter, Common, Utils, Constants, JSONModel, jQuery, HashChanger, MessageStrip, DynamicTable, FASummary, MessageBox, History, UploadCollectionParameter) {
        "use strict";

        var that;
        var _promiseResult;
        var _newIONo = "";
        var _sAction;
        var _shellHash;
        var _shellHome;

        var sIONo = "", sIOItem = "", sDlvSeq = "", sTableName = "", sDeleted = "";
        var sIOPrefix = "", sIODesc = "";

        var hasSDData = false;
        var SalDocData;
        var uniqueSDData;
        var uniqueIODLVData;

        var _sStyleNo, _sVerNo, _sStyleCd, _sProdTyp, _sSalesGrp, _sSeasonCd, _sCustGrp, _sUOM;

        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "YYYY-MM-dd" });

        var timeFormat = sap.ui.core.format.DateFormat.getTimeInstance({ pattern: "KK:mm:ss a" });
        var TZOffsetMs = new Date(0).getTimezoneOffset() * 60 * 1000;

        var Core = sap.ui.getCore();

        var _seqNo = 0;

        return Controller.extend("zuiio2.controller.iodetail", {
            onInit: function () {
                that = this;

                // sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = this._fBackButton;

                this._ccolumns;

                //Initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();

                //get current userid
                var oModel = new sap.ui.model.json.JSONModel();
                oModel.loadData("/sap/bc/ui2/start_up").then(() => {
                    this._userid = oModel.oData.id;
                })

                // if (sap.ui.getCore().byId("backBtn") !== undefined) {
                //     // this._fBackButton = sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction;

                //     // var oView = this.getView();
                //     // oView.addEventDelegate({
                //     //     onAfterShow: function (oEvent) {
                //     //         // console.log("back")
                //     //         sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = that._fBackButton;
                //     //         that.onRefresh();
                //     //     }
                //     // }, oView);

                //     this._router.attachRouteMatched(this.onRouteMatched, this);
                // }

                this._oModel = this.getOwnerComponent().getModel();
                this._Model = this.getOwnerComponent().getModel();
                this._Model2 = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                this._Model3 = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                this._Model4 = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                this._oModelLock = this.getOwnerComponent().getModel("ZGW_3DERP_LOCK_SRV");

                this._router.getRoute("RouteIODetail").attachPatternMatched(this._routePatternMatched, this);

                this.getView().setModel(new JSONModel({
                    sbu: '',
                    currIONo: '',
                    currStyleNo: '',
                    currVerNo: '',
                    currDlvSeq: '999',
                    currDlvItem: '999',
                    hasSDData: false,
                    icontabfilterkey: '',
                    IODesc: '',
                    IOPrefix: '',
                    IOOrdQty: 0,
                    IORevOrdQty: 0,
                    hasCSData: true,
                    CustDlvDt: '',
                    WeaveTyp: '',
                    ProdDays: 0,
                    ProdWk: ''
                }), "ui2");

                this.getView().setModel(new JSONModel({
                    dataMode: "INIT",
                    today: "",
                    DisplayMode: "change",
                    LockType: "",
                    LockMessage: ""
                }), "ui");

                this.getAppAction();

                //Add the attachments to screen
                this.appendUploadCollection();

                //Set the file data model
                var oModel = this.getOwnerComponent().getModel("FileModel");
                this.getView().setModel(oModel, "FileModel");

                //set edit mode to the upload collection
                var oJSONModel = new JSONModel();
                var data = {};
                data.editMode = false;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "FilesEditModeModel");

                var oTableEventDelegate = {
                    onkeyup: function (oEvent) {
                        that.onKeyUp(oEvent);
                    },

                    onAfterRendering: function (oEvent) {
                        var oControl = oEvent.srcControl;
                        var sTabId = oControl.sId.split("--")[oControl.sId.split("--").length - 1];

                        if (sTabId.substr(sTabId.length - 3) === "Tab") that._tableRendered = sTabId;
                        else that._tableRendered = "";

                        that.onAfterTableRendering();
                    }
                };

                this.byId("ioMatListTab").addEventDelegate(oTableEventDelegate);
                this.byId("colorTab").addEventDelegate(oTableEventDelegate);
                this.byId("processTab").addEventDelegate(oTableEventDelegate);
                this.byId("sizeTab").addEventDelegate(oTableEventDelegate);
                this.byId("styleBOMUVTab").addEventDelegate(oTableEventDelegate);
                this.byId("styleFabBOMTab").addEventDelegate(oTableEventDelegate);
                this.byId("styleAccBOMTab").addEventDelegate(oTableEventDelegate);
                this.byId("styleMatListTab").addEventDelegate(oTableEventDelegate);
                this.byId("costHdrTab").addEventDelegate(oTableEventDelegate);
                this.byId("costDtlsTab").addEventDelegate(oTableEventDelegate);

                this.byId("iodetMatTab").addEventDelegate(oTableEventDelegate);
                this.byId("IOATTRIBTab").addEventDelegate(oTableEventDelegate);
                this.byId("IOSTATUSTab").addEventDelegate(oTableEventDelegate);
                this.byId("IODLVTab").addEventDelegate(oTableEventDelegate);
                this.byId("IODETTab").addEventDelegate(oTableEventDelegate);

                if (sap.ui.getCore().byId("backBtn") !== undefined) {
                    this._fBackButton = sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction;
                    sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = function (oEvent) {
                        that.onNavBack();
                    }
                }

                window.onhashchange = function () {
                    _shellHome = window.history.state.sap.history[window.history.state.sap.history.length - 1];
                }
                // window.onhashchange = function () {
                //     console.log("windows");
                //     let iCnt = 0;
                //     console.log(window.history.state.sap.history);
                //     console.log(window.history.state.sap.history[window.history.state.sap.history.length - 1]);

                //     console.log(iCnt);
                //     console.log(that._routeToStyle);
                //     console.log(that._fromIOroute);

                //     if(window.history.state.sap.history[window.history.state.sap.history.length - 1].indexOf("RouteIODetail") >= 0 && !that._routeToStyle && that._fromIOroute){
                //         window.history.state.sap.history.forEach((item, index) => {
                //             console.log(item);
                //             if(item.indexOf(("ZSO_3DERP_ORD_IO-change") >= 0 || item.indexOf("ZSO_3DERP_ORD_IO-display") >= 0) && iCnt === 0){

                //                 iCnt = 1;
                //                 window.history.go((index + 1) - window.history.state.sap.history.length);
                //             }
                //         })
                //     }

                //     // // if(!that._routeToStyle) {
                //     // // if (window.history.state.sap.history[window.history.state.sap.history.length - 1].indexOf("RouteIODetail") >= 0) { 

                //     // // if (window.history.state.sap.history[window.history.state.sap.history.length - 1].indexOf("ZSO_3DERP_ORD_STYLE") >= 0 && !that._routeToStyle) { 
                //     // if ((window.history.state.sap.history[window.history.state.sap.history.length - 1].indexOf("RouteIODetail") >= 0
                //     //     || window.history.state.sap.history[window.history.state.sap.history.length - 1].indexOf("RouteStyleDetail") >= 0
                //     //     || window.history.state.sap.history[window.history.state.sap.history.length - 1].indexOf("RouteVersion") >= 0)
                //     //     && !that._routeToStyle && that._fromIOroute) {
                //     // // if (window.history.state.sap.history[window.history.state.sap.history.length - 1].indexOf("ZSO_3DERP_ORD_STYLE") >= 0 && !that._routeToStyle) {

                //     //     // window.history.go((index + 1) - window.history.state.sap.history.length);   

                //     //     window.history.state.sap.history.forEach((item, index) => {
                //     //             if(item.indexOf("RouteIODetail") >= 0){
                //     //             window.history.go((index + 1) - window.history.state.sap.history.length);   
                //     //             }     

                //     //             // if(item.indexOf("RouteIODetail") >= 0){
                //     //             //     window.history.go((index + 1) - window.history.state.sap.history.length);   
                //     //             //     }  
                //     //     })
                //     // }

                //     // if (window.history.state.sap.history[window.history.state.sap.history.length - 1].indexOf("Shell-home") >= 0 && window.history.state.sap.history.length > 0 
                //     // && !that._routeToStyle && that._fromIOroute) {
                //     //     window.history.go((window.history.state.sap.history.length-1) - window.history.state.sap.history.length);  
                //     // }
                // }
            },

            onRouteMatched: function (oEvent) {
                var sRouteName = oEvent.getParameter("name");
                // console.log(sRouteName);
                if (sRouteName !== "RouteIODetail") {
                    window.history.pushState(null, null, window.location.pathname);
                    this._router.navTo("Routeioinit", {}, true);
                }
            },

            getAppAction: async function () {
                // console.log("getAppAction");
                // console.log(sap.ushell.Container)
                var csAction = "change";
                if (sap.ushell.Container !== undefined) {
                    const fullHash = new HashChanger().getHash();
                    const urlParsing = await sap.ushell.Container.getServiceAsync("URLParsing");
                    const shellHash = urlParsing.parseShellHash(fullHash);
                    csAction = shellHash.action;
                    _sAction = shellHash.action;
                    _shellHash = shellHash;
                }

                var DisplayStateModel = new JSONModel();
                var DisplayData = {
                    sAction: csAction,
                    visible: csAction === "display" ? false : true
                }

                this.getView().getModel("ui").setProperty("/DisplayMode", csAction);

                DisplayStateModel.setData(DisplayData);
                this.getView().setModel(DisplayStateModel, "DisplayActionModel");
                // console.log(this.getView().getModel("DisplayActionModel"));
                // console.log(this.getView());

                // console.log(this.byId("btnHdrEdit"));
                // console.log(this.byId("btnHdrDelete"));

                // this.byId("btnHdrEdit").setVisible(csAction === "display" ? false : true);
                // this.byId("btnHdrDelete").setVisible(csAction === "display" ? false : true);
                this.byId("onIOEdit").setVisible(csAction === "display" ? false : true);
                this.byId("onIORelease").setVisible(csAction === "display" ? false : true);
                this.byId("btnCreateStyle").setVisible(csAction === "display" ? false : true);
                this.byId("btnEditColor").setVisible(csAction === "display" ? false : true);
                this.byId("btnEditProcess").setVisible(csAction === "display" ? false : true);
                this.byId("btnDeleteSize").setVisible(csAction === "display" ? false : true);
                this.byId("btnUndeleteSize").setVisible(csAction === "display" ? false : true);
                this.byId("btnFabGenMatLst").setVisible(csAction === "display" ? false : true);
                this.byId("btnAccGenMatLst").setVisible(csAction === "display" ? false : true);
                this.byId("btnNewDlvSched").setVisible(csAction === "display" ? false : true);
                this.byId("btnEditDlvSched").setVisible(csAction === "display" ? false : true);
                this.byId("btnDeleteDlvSched").setVisible(csAction === "display" ? false : true);
                this.byId("btnCopyDlvSched").setVisible(csAction === "display" ? false : true);
                this.byId("btnImportPODlvSched").setVisible(csAction === "display" ? false : true);
                this.byId("btnGenMatList").setVisible(csAction === "display" ? false : true);
                this.byId("btnNewIODet").setVisible(csAction === "display" ? false : true);
                this.byId("btnEditIODet").setVisible(csAction === "display" ? false : true);
                this.byId("btnEditIOMatList").setVisible(csAction === "display" ? false : true);
                this.byId("btnDeleteIOMatList").setVisible(csAction === "display" ? false : true);
                this.byId("btnSubmitMRP").setVisible(csAction === "display" ? false : true);
                this.byId("btnAssignMatNo").setVisible(csAction === "display" ? false : true);
                this.byId("btnReorderIOMatList").setVisible(csAction === "display" ? false : true);
                this.byId("btnNewCostHdr").setVisible(csAction === "display" ? false : true);
                this.byId("btnEditCostHdr").setVisible(csAction === "display" ? false : true);
                this.byId("btnEditCostDtl").setVisible(csAction === "display" ? false : true);
                this.byId("btnReleaseCosting").setVisible(csAction === "display" ? false : true);
                this.byId("btnEditAttach").setVisible(csAction === "display" ? false : true);
            },

            // onExit: function() {
            //     // sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = this._fBackButton;
            // },

            onNavBack: function (oEvent) {
                console.log("onNavBack")
                console.log(window.location.href);
                console.log(window.location.hash);
                if (!that._routeToStyle) {
                    this.routeTOIO(window.location.hash);
                    //sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction = this._fBackButton;
                }
                else {
                    var oHistory = History.getInstance();
                    var sPreviousHash = oHistory.getPreviousHash();

                    if (sPreviousHash !== undefined) {
                        window.history.go(-1);
                    } else {
                        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                        oRouter.navTo("Routeioinit", {}, true);
                    }
                }
            },

            routeTOIO: function (arg) {
                let currentPath = arg;
                // console.log("current path: " + currentPath);
                // console.log(currentPath.indexOf("ZSO_3DERP_ORD_IO-change&/RouteIODetail"));
                // console.log(currentPath.indexOf("ZSO_3DERP_ORD_IO-display&/RouteIODetail"));
                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
                let hash;
                if ((currentPath.indexOf("ZSO_3DERP_ORD_IO-change&/RouteIODetail") > 0
                    || currentPath.indexOf("ZSO_3DERP_ORD_IO-display&/RouteIODetail") > 0)
                    && currentPath !== undefined) {
                    hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                        target: {
                            semanticObject: "ZSO_3DERP_ORD_IO",
                            action: _sAction //+ "&/RouteIODetail/" + this._iono + "/" + this._sbu + "/" + this._styleNo + "/itfSTYLE"
                        }

                    })) || ""; // generate the Hash to display style

                } else {
                    hash = "#Shell-home";
                }

                oCrossAppNavigator.toExternal({
                    target: {
                        shellHash: hash
                    }
                });

                window.history.pushState({ shellHash: hash }, "");
            },

            _routePatternMatched: async function (oEvent) {
                // console.log(oEvent);
                var me = this;
                // console.log(this.getView().getModel("ui2").getProperty("/icontabfilterkey"));
                // var cIconTabBar = me.getView().byId("idIconTabBarInlineMode");
                // // console.log(cIconTabBar);

                // cIconTabBar.setSelectedKey("itfIOHDR");

                me.hasSDData = false;

                this._ioNo = oEvent.getParameter("arguments").iono; //get IONO from route pattern
                this._sbu = oEvent.getParameter("arguments").sbu; //get SBU from route pattern
                this._styleno = oEvent.getParameter("arguments").styleno; //get style no from route pattern
                // this._ver = oEvent.getParameter("arguments").ver; //get ver from route pattern

                // console.log(oEvent.getParameter("arguments").styleno);

                this.getView().getModel("ui2").setProperty("/sbu", oEvent.getParameter("arguments").sbu);
                this.getView().getModel("ui2").setProperty("/currIONo", oEvent.getParameter("arguments").iono);
                this.getView().getModel("ui2").setProperty("/currStyleNo", oEvent.getParameter("arguments").styleno);

                // this.getView().getModel("ui2").setProperty("/icontabfilterkey", oEvent.getParameter("arguments").icontabfilterkey);

                this.byId("onIOEdit").setVisible(this.getView().getModel("ui").getProperty("/DisplayMode") === "display" ? false : true);
                this.byId("onIORelease").setVisible(this.getView().getModel("ui").getProperty("/DisplayMode") === "display" ? false : true);
                this.byId("btnEditAttach").setVisible(this.getView().getModel("ui").getProperty("/DisplayMode") === "display" ? false : true);

                if (this.getView().getModel("ui2").getProperty("/icontabfilterkey") === '') {
                    this.getView().getModel("ui2").setProperty("/icontabfilterkey", oEvent.getParameter("arguments").icontabfilterkey);
                }

                var cIconTabBar = me.getView().byId("idIconTabBarInlineMode");
                cIconTabBar.setSelectedKey(this.getView().getModel("ui2").getProperty("/icontabfilterkey"));

                this.getCaptionSet();

                //get Value Help for fields of IO Header
                this.getVHSet("/IOTYPSet", "IOTypeModel", false, false);
                this.getVHSet("/PRODTYPvhSet", "ProdTypeModel", true, false);
                this.getVHSet("/PRODSCENvhSet", "ProdScenModel", false, false);
                this.getVHSet("/SEASONSet", "SeasonsModel", true, false);
                this.getVHSet("/STYLENOvhSet", "StyleNoModel", false, false);
                this.getVHSet("/UOMvhSet", "UOMModel", false, false);
                this.getVHSet("/SALESORGvhSet", "SalesOrgModel", false, false);
                this.getVHSet("/SALESGRPvhSet", "SalesGrpModel", false, false);
                this.getVHSet("/PRODPLANTvhSet", "PlantModel", false, false);
                this.getVHSet("/STYLECDvhSet", "StyleCdModel", false, false);
                this.getVHSet("/CUSTGRPvhSet", "CustGrpModel", false, false);
                this.getVHSet("/BILLTOvhSet", "BILLTOModel", false, false);
                this.getVHSet("/SHIPTOvhSet", "SHIPTOModel", false, false);
                // this.getVHSet("/SOLDTOvhSet", "SOLDTOModel", false);
                this.getVHSet("/SoldToCustSet", "SOLDTOModel", false, false);
                this.getVHSet("/UOMINFOSet", "UOMINFOModel", false, false);
                this.getVHSet("/SALTERMvhSet", "SalesTermModel", false, false);

                // console.log("Sales Document Data");
                // console.log(this.getOwnerComponent().getModel("routeModel").getProperty("/results"));

                me.SalDocData = this.getOwnerComponent().getModel("routeModel").getProperty("/results");

                // console.log(me.SalDocData);

                if (me.SalDocData !== undefined) {
                    // console.log(me.SalDocData.length);

                    if (me.SalDocData.length > 0) {
                        me.hasSDData = true;
                        this.getView().getModel("ui2").setProperty("/hasSDData", true);
                        me.uniqueSDData = me.SalDocData.filter((SalDocData, index, self) =>
                            index === self.findIndex((t) => (t.SALESGRP === SalDocData.SALESGRP && t.STYLENO === SalDocData.STYLENO && t.UOM === SalDocData.UOM
                                && t.PRODTYP === SalDocData.PRODTYP && t.SEASONCD === SalDocData.SEASONCD && t.STYLECD === SalDocData.STYLECD && t.VERNO === SalDocData.VERNO
                                && t.CUSTGRP === SalDocData.CUSTGRP)));
                    }

                    // console.log("New IO - SD Data");
                    // console.log(me.uniqueSDData);
                }

                // alert(this._ioNo);
                //pivot arrays
                this._iocolors;
                this._iosizes;

                // this._ccolumns;

                this._tblChange = false;

                this._styleNo = "";
                this._dataMode = "READ";
                this._styleVer = "";
                this._prodplant = "";
                this._tableRendered = "";

                this._aFunction = {};
                this._aIOColumns = {};
                this._aColumns = {};
                this._aSortableColumns = {};
                this._aFilterableColumns = {};
                this._aDataBeforeChange = [];
                this._aIODataBeforeChange = [];
                this._validationErrors = [];

                // alert(this._ioNo);

                //set all as no changes at first load
                this._headerChanged = false;

                //set Change Status    
                this.setChangeStatus(false);
                Common.openLoadingDialog(that);

                // // console.log("getHeaderConfig");
                // _promiseResult = new Promise((resolve, reject) => {

                //     resolve(me.getHeaderConfig());
                // });
                // await _promiseResult;

                await me.getHeaderConfig();

                // console.log("getHeaderData");
                // _promiseResult = new Promise((resolve, reject) => {
                //     // setTimeout(() => {
                //         this.getHeaderData();
                //     // }, 100);
                //     resolve();
                // });
                // await _promiseResult;

                if (this._ioNo === "NEW") {
                    await this.setHeaderEditMode();

                    this.byId("onIOEdit").setVisible(false);
                    this.byId("onIORelease").setVisible(false);
                    // this.byId("onIOAttribEdit").setVisible(false);
                    // this.byId("onIOStatEdit").setVisible(false);
                    this.byId("onIOSave").setVisible(true);
                    this.byId("onIOCancel").setVisible(true);

                    // console.log("disableOtherTabs");
                    this.disableOtherTabs();

                    var oIconTabBarIO = this.byId("idIconTabBarInlineIOHdr");
                    oIconTabBarIO.getItems().filter(item => item.getProperty("key"))
                        .forEach(item => item.setProperty("enabled", false));

                    var oDisplayJSONModel = new JSONModel();
                    var data = {};
                    // data.editMode = true;
                    if (this._styleno === "NEW") {
                        // alert("WITHOUT STYLE");
                        if (me.hasSDData === false) {
                            data = {
                                "IONO": "",
                                "STYLENO": "",
                                "VERNO": "",
                                "STYLECD": "",
                                "PRODTYPE": "",
                                "SALESGRP": "",
                                "SEASONCD": "",
                                "CUSTGRP": "",
                                "BASEUOM": "",
                                "PRODSTART": "",
                                "ORDQTY": 0,
                                "ACTUALQTY": 0,
                                "REVORDQTY": 0,
                                "SHIPQTY": 0,
                                "PLANQTY": 0
                            };
                        } else {
                            var IOQty = "0";
                            // console.log("uniqueSDData");
                            // console.log(me.uniqueSDData);
                            // me.SalDocData.forEach(item => {
                            //     // if (isNumeric(item.QTY))
                            //         IOQty += item.QTY;
                            // })

                            me.uniqueSDData.forEach(item => {
                                data = {
                                    "IONO": "",
                                    "SALESGRP": item.SALESGRP,
                                    "STYLENO": item.STYLENO,
                                    "BASEUOM": item.UOM,
                                    "PRODTYPE": item.PRODTYP,
                                    "SEASONCD": item.SEASONCD,
                                    "STYLECD": item.STYLECD,
                                    "VERNO": item.VERNO,
                                    "CUSTGRP": item.CUSTGRP,
                                    "SOLDTOCUST": item.CUSTSOLDTO,
                                    "ORDQTY": IOQty,
                                    "PRODSTART": "",
                                    "ORDQTY": 0,
                                    "ACTUALQTY": 0,
                                    "REVORDQTY": 0,
                                    "SHIPQTY": 0,
                                    "PLANQTY": 0
                                };
                            });
                        }

                        // console.log("NEW IO DATA");
                        // console.log(data);

                        this._headerChanged = false;
                        data.editMode = true;
                        // console.log(data);
                        oDisplayJSONModel.setData(data);
                        this.getView().setModel(oDisplayJSONModel, "headerData");
                        // console.log(this.getView().setModel(oDisplayJSONModel, "headerData"));

                        this.setRequiredFields();
                    }
                } else {
                    this.cancelHeaderEdit();
                    this.enableOtherTabs();
                    var oIconTabBarIO = this.byId("idIconTabBarInlineIOHdr");
                    oIconTabBarIO.getItems().filter(item => item.getProperty("key"))
                        .forEach(item => item.setProperty("enabled", true));

                    this._validationErrors = [];
                }

                // // console.log("getHeaderConfig");
                // _promiseResult = new Promise((resolve, reject) => {
                //     setTimeout(() => {
                //         this.getHeaderConfig();
                //     }, 100);
                //     resolve();
                // });
                // await _promiseResult;

                // console.log("getHeaderData");
                // _promiseResult = new Promise((resolve, reject) => {
                //     setTimeout(() => {
                await this.getHeaderData();
                //     }, 100);
                //     resolve();
                // });
                // await _promiseResult;

                // console.log("hasSDData");
                // console.log(me.hasSDData);

                // console.log("New IO / Style No from Sales Doc");
                // console.log(this.getView().getModel("ui2").getProperty("/currStyleNo"));
                // console.log(this._ioNo);

                if (this._styleno != "NEW" && this._ioNo === "NEW") {
                    // alert("Get IO Style Data");
                    let strStyle = this.getView().getModel("ui2").getProperty("/currStyleNo");

                    if (me.hasSDData === false) {
                        // console.log("No SD Data, with Style No");
                        this.getIOSTYLISTData(strStyle);
                    } else {
                        // console.log("has SD Data");
                        var data = {};

                        var IOQty = 0;
                        // console.log("IO Qty Sum");
                        // console.log(me.SalDocData);
                        me.SalDocData.forEach(item => {
                            // if (isNumeric(item.QTY))
                            IOQty += +item.QTY;
                        })

                        me.uniqueSDData.forEach(item => {
                            data = {
                                "IONO": "",
                                "SALESGRP": item.SALESGRP,
                                "STYLENO": item.STYLENO,
                                "BASEUOM": item.UOM,
                                "PRODTYPE": item.PRODTYP,
                                "SEASONCD": item.SEASONCD,
                                "STYLECD": item.STYLECD,
                                "VERNO": item.VERNO,
                                "CUSTGRP": item.CUSTGRP,
                                "SOLDTOCUST": item.CUSTSOLDTO,
                                "ORDQTY": +IOQty,
                                "REVORDQTY": +IOQty,
                                "ACTUALQTY": 0,
                                "SHIPQTY": 0,
                                "PLANQTY": 0
                            };
                        });

                        oDisplayJSONModel.setData(data);
                        this.getView().setModel(oDisplayJSONModel, "headerData");

                        // me.SaveSDData("NEWIONO");
                    }
                }

                // console.log(this.getView());
                // this._aFunction = {};
                // this._aIOColumns = {};
                // this._aColumns = {};
                // this._aSortableColumns = {};
                // this._aFilterableColumns = {};
                // this._aDataBeforeChange = [];
                // this._aIODataBeforeChange = [];
                var me = this;

                this.byId("IODLVTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                // this.byId("IODETTab")
                //     .setModel(new JSONModel({
                //         columns: [],
                //         rows: []
                //     }));

                this.byId("IOATTRIBTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                this.byId("IOSTATUSTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                this.byId("iodetMatTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                var ioNo = this._ioNo;

                // var me = this;

                this.oJSONModel = new sap.ui.model.json.JSONModel();

                // console.log("getIODETColumnData");
                // _promiseResult = new Promise((resolve, reject) => {
                //     setTimeout(() => {
                //         resolve(this.getIODETColumnData("IODET", "ZERP_IODET"));
                //     }, 100);
                // });
                // await _promiseResult;

                // console.log("getIOATTRIBData");
                // console.log(ioNo);
                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this.getIOATTRIBData(ioNo);
                        this._bIOATTRIBChanged = false;
                    }, 100);
                    resolve();
                });
                await _promiseResult;

                // console.log("getIOSTATUSData");
                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this.getIOSTATUSData(ioNo);
                        this._bIOSTATUSChanged = false;
                    }, 100);
                    resolve();
                });
                await _promiseResult;

                // console.log("getIOSizes 1");
                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        // console.log("getIOSizes 2");
                        this.getIOSizes();
                    }, 100);
                    resolve();
                });
                await _promiseResult;

                // console.log("getIODLVData");
                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this.getIODLVData(ioNo);
                    }, 100);
                    resolve();
                });
                await _promiseResult;

                // console.log("getIODLVData");
                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this.getIODETMATLSTData(ioNo, this.getView().getModel("ui2").getProperty("/currDlvSeq"));
                    }, 100);
                    resolve();
                });
                await _promiseResult;

                // var IODLVRows = me.getView().getModel("IODLVTab").getProperty("/rows");
                // console.log("IODLVRows");
                // console.log(IODLVRows);

                // _promiseResult = new Promise((resolve, reject) => {
                //     setTimeout(() => {
                //         this.getIOColumnProp();
                //     }, 100);
                //     resolve();
                // });
                // await _promiseResult;

                await this.getReloadIOColumnProp();

                var oIconTabBarStyle = this.byId("itbStyleDetail");
                oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));

                //Attachments
                this.bindUploadCollection();
                this.getView().getModel("FileModel").refresh();

                //IO Material List

                // _promiseResult = new Promise((resolve, reject) => {
                // setTimeout(() => {
                //     this.initIOMatList();
                // }, 100);
                // });
                // await _promiseResult;
                Common.closeLoadingDialog(that);

                this._fromIOroute = true;
                this._routeToStyle = false;
                // window.open(window.document.URL, "_self");    
                // var url = new URL(window.location);
                // // url.hash = "#ZSO_IO2-display";
                // // url.href = url.origin + url.pathname + url.search + "#ZSO_IO2-display";
                // console.log(url.origin + url.pathname + url.search + "#ZSO_IO2-display");
                // window.history.pushState(window.history.state, '', url.origin + url.pathname + url.search + "#ZSO_IO2-display");
                // console.log(window.history)

                this._aColFilters = [];
                this._aColSorters = [];
            },

            getCaptionSet: function () {
                let me = this;
                var oDDTextParam = [], oDDTextResult = {};
                var oJSONModelDDText = new JSONModel();
                var oModel = me.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oDDTextParam.push({ CODE: "CONFIRM_DISREGARD_CHANGE" });
                oDDTextParam.push({ CODE: "INFO_NO_DATA_EDIT" });
                oDDTextParam.push({ CODE: "COLORS" });
                oDDTextParam.push({ CODE: "PROCESSES" });
                oDDTextParam.push({ CODE: "SIZE" });
                oDDTextParam.push({ CODE: "DTLDBOM" });
                oDDTextParam.push({ CODE: "BOMBYUV" });
                oDDTextParam.push({ CODE: "MATLIST" });
                oDDTextParam.push({ CODE: "EDIT" });
                oDDTextParam.push({ CODE: "SAVE" });
                oDDTextParam.push({ CODE: "CANCEL" });
                oDDTextParam.push({ CODE: "MANAGESTYLE" });
                oDDTextParam.push({ CODE: "NEW" });
                oDDTextParam.push({ CODE: "STYLEHDR" });
                oDDTextParam.push({ CODE: "PARTCD" });
                oDDTextParam.push({ CODE: "PARTDESC" });
                oDDTextParam.push({ CODE: "MATTYP" });
                oDDTextParam.push({ CODE: "GMC" });
                oDDTextParam.push({ CODE: "GMCDESC" });
                oDDTextParam.push({ CODE: "USGCLS" });
                oDDTextParam.push({ CODE: "SEQNO" });
                oDDTextParam.push({ CODE: "BOMITEM" });
                oDDTextParam.push({ CODE: "MATTYPCLS" });
                oDDTextParam.push({ CODE: "CONSUMP" });
                oDDTextParam.push({ CODE: "WASTAGE" });
                oDDTextParam.push({ CODE: "COLORCD" });
                oDDTextParam.push({ CODE: "ATTRIBUTE" });
                oDDTextParam.push({ CODE: "SIZECD" });
                oDDTextParam.push({ CODE: "SIZEGRP" });
                oDDTextParam.push({ CODE: "POCOLOR" });
                oDDTextParam.push({ CODE: "DESC" });
                oDDTextParam.push({ CODE: "USGCLS" });
                oDDTextParam.push({ CODE: "INFO_CHECK_INVALID_ENTRIES" });
                oDDTextParam.push({ CODE: "INFO_NO_DATA_MODIFIED" });
                oDDTextParam.push({ CODE: "INFO_DATA_SAVE" });
                oDDTextParam.push({ CODE: "SAVELAYOUT" });
                oDDTextParam.push({ CODE: "INFO_LAYOUT_SAVE" });
                oDDTextParam.push({ CODE: "FABBOM" });
                oDDTextParam.push({ CODE: "ACCBOM" });
                oDDTextParam.push({ CODE: "GENSTYLEMATLIST" });
                oDDTextParam.push({ CODE: "INFO_IOMATLIST_GENERATED" });
                oDDTextParam.push({ CODE: "INFO_NO_IOMATLIST_GENERATED" });
                oDDTextParam.push({ CODE: "INFO_NO_DATA_TO_PROC" });
                oDDTextParam.push({ CODE: "ASSIGNSAPMAT" });
                oDDTextParam.push({ CODE: "AUTOASSIGNSAPMAT" });
                oDDTextParam.push({ CODE: "CREATESAPMAT" });
                oDDTextParam.push({ CODE: "REORDER" });
                oDDTextParam.push({ CODE: "CLOSE" });
                oDDTextParam.push({ CODE: "VENDOR" });
                oDDTextParam.push({ CODE: "REORDERQTY" });
                oDDTextParam.push({ CODE: "REMARKS" });
                oDDTextParam.push({ CODE: "DELETED" });
                oDDTextParam.push({ CODE: "ADD" });
                oDDTextParam.push({ CODE: "INFO_NO_MATLIST" });
                oDDTextParam.push({ CODE: "INFO_REORDER_CREATED" });
                oDDTextParam.push({ CODE: "DELETE" });
                oDDTextParam.push({ CODE: "INFO_DATA_DELETED" });
                oDDTextParam.push({ CODE: "CREATEDBY" });
                oDDTextParam.push({ CODE: "CREATEDDT" });
                oDDTextParam.push({ CODE: "UPDATEDBY" });
                oDDTextParam.push({ CODE: "UPDATEDDT" });
                oDDTextParam.push({ CODE: "REFRESH" });
                oDDTextParam.push({ CODE: "UNDELETE" });
                oDDTextParam.push({ CODE: "INFO_SEL_RECORD_UNDELETED" });
                oDDTextParam.push({ CODE: "INFO_SEL_RECORD_NOT_DELETED" });
                oDDTextParam.push({ CODE: "INFO_INPUT_REQD_FIELDS" });
                oDDTextParam.push({ CODE: "INFO_INVALID_IOMATLIST_GENERATED" });

                oDDTextParam.push({ CODE: "CONFIRM_DISREGARD_CHANGE" });
                oDDTextParam.push({ CODE: "INFO_NO_DATA_EDIT" });
                oDDTextParam.push({ CODE: "COLORS" });
                oDDTextParam.push({ CODE: "PROCESSES" });
                oDDTextParam.push({ CODE: "SIZE" });
                oDDTextParam.push({ CODE: "DTLDBOM" });
                oDDTextParam.push({ CODE: "BOMBYUV" });
                oDDTextParam.push({ CODE: "MATLIST" });
                oDDTextParam.push({ CODE: "EDIT" });
                oDDTextParam.push({ CODE: "SAVE" });
                oDDTextParam.push({ CODE: "CANCEL" });
                oDDTextParam.push({ CODE: "MANAGESTYLE" });
                oDDTextParam.push({ CODE: "NEW" });
                oDDTextParam.push({ CODE: "STYLEHDR" });
                oDDTextParam.push({ CODE: "PARTCD" });
                oDDTextParam.push({ CODE: "PARTDESC" });
                oDDTextParam.push({ CODE: "MATTYP" });
                oDDTextParam.push({ CODE: "GMC" });
                oDDTextParam.push({ CODE: "GMCDESC" });
                oDDTextParam.push({ CODE: "USGCLS" });
                oDDTextParam.push({ CODE: "SEQNO" });
                oDDTextParam.push({ CODE: "BOMITEM" });
                oDDTextParam.push({ CODE: "MATTYPCLS" });
                oDDTextParam.push({ CODE: "CONSUMP" });
                oDDTextParam.push({ CODE: "WASTAGE" });
                oDDTextParam.push({ CODE: "COLORCD" });
                oDDTextParam.push({ CODE: "ATTRIBUTE" });
                oDDTextParam.push({ CODE: "SIZECD" });
                oDDTextParam.push({ CODE: "SIZEGRP" });
                oDDTextParam.push({ CODE: "POCOLOR" });
                oDDTextParam.push({ CODE: "DESC" });
                oDDTextParam.push({ CODE: "USGCLS" });
                oDDTextParam.push({ CODE: "INFO_CHECK_INVALID_ENTRIES" });
                oDDTextParam.push({ CODE: "INFO_NO_DATA_MODIFIED" });
                oDDTextParam.push({ CODE: "INFO_DATA_SAVE" });
                oDDTextParam.push({ CODE: "SAVELAYOUT" });
                oDDTextParam.push({ CODE: "INFO_LAYOUT_SAVE" });
                oDDTextParam.push({ CODE: "SUBMITMRP" });
                oDDTextParam.push({ CODE: "ASSIGNMATNO" });
                oDDTextParam.push({ CODE: "EXCELEXPORT" });
                oDDTextParam.push({ CODE: "FULLSCREEN" });
                oDDTextParam.push({ CODE: "EXITFULLSCREEN" });
                oDDTextParam.push({ CODE: "INFO_MATNO_ALREADY_EXIST" });
                oDDTextParam.push({ CODE: "MATDESC1" });
                oDDTextParam.push({ CODE: "UOM" });
                oDDTextParam.push({ CODE: "MATNO" });
                oDDTextParam.push({ CODE: "INFO_NO_RECORD_TO_PROC" });
                oDDTextParam.push({ CODE: "INFO_MATNO_ASSIGNED" });
                oDDTextParam.push({ CODE: "INFO_MRPDATA_CREATED" });
                oDDTextParam.push({ CODE: "INFO_NO_SEL_RECORD_TO_PROC" });
                oDDTextParam.push({ CODE: "INFO_MATERIAL_CREATED" });
                oDDTextParam.push({ CODE: "INFO_IVALID_RECORD_FOR_MRP" });
                oDDTextParam.push({ CODE: "INFO_SEL_RECORD_ALREADY_DELETED" });
                oDDTextParam.push({ CODE: "INFO_DELETE_NOT_ALLOW" });
                oDDTextParam.push({ CODE: "INFO_FF_REC_CANNOT_DELETE" });
                oDDTextParam.push({ CODE: "INFO_NO_DELETE_PENDINGDOC" });
                oDDTextParam.push({ CODE: "INFO_NO_DELETE_PLANTAVAIL" });
                oDDTextParam.push({ CODE: "INFO_NO_DELETE_ISSTOPROD" });
                oDDTextParam.push({ CODE: "INFO_FF_REC_DELETED" });
                oDDTextParam.push({ CODE: "INFO_SEL_RECORD_DELETED" });
                oDDTextParam.push({ CODE: "INFO_INVALID_RECORD_FOR_MATNO_CREATE" });

                oDDTextParam.push({ CODE: "PRINT" });
                oDDTextParam.push({ CODE: "RELCOSTING" });
                oDDTextParam.push({ CODE: "CSTYPE" });
                oDDTextParam.push({ CODE: "CSVCD" });
                oDDTextParam.push({ CODE: "VERDESC" });
                oDDTextParam.push({ CODE: "SALESTERM" });
                oDDTextParam.push({ CODE: "CSDATE" });
                oDDTextParam.push({ CODE: "CREATECOSTING" });
                oDDTextParam.push({ CODE: "INFO_NO_DATA_TO_REFRESH" });
                oDDTextParam.push({ CODE: "INFO_COSTING_RELEASE" });
                oDDTextParam.push({ CODE: "INFO_STATUS_ALREADY_REL" });

                oDDTextParam.push({ CODE: "IOITEM" });
                oDDTextParam.push({ CODE: "SALDOCNO" });
                oDDTextParam.push({ CODE: "SALDOCITEM" });
                oDDTextParam.push({ CODE: "CUSTCOLOR" });
                oDDTextParam.push({ CODE: "UNITPRICE1" });
                oDDTextParam.push({ CODE: "UNITPRICE2" });
                oDDTextParam.push({ CODE: "UNITPRICE3" });
                oDDTextParam.push({ CODE: "REVUPRICE1" });
                oDDTextParam.push({ CODE: "REVUPRICE2" });
                oDDTextParam.push({ CODE: "REVUPRICE3" });
                oDDTextParam.push({ CODE: "CUSTSIZE" });
                oDDTextParam.push({ CODE: "REVORDERQTY" });
                oDDTextParam.push({ CODE: "ORDERQTY" });
                oDDTextParam.push({ CODE: "ACTUALQTY" });
                oDDTextParam.push({ CODE: "PLANSHPQTY" });
                oDDTextParam.push({ CODE: "SHIPQTY" });
                oDDTextParam.push({ CODE: "MATNO" });
                oDDTextParam.push({ CODE: "BATCH" });
                oDDTextParam.push({ CODE: "REVDLVDT" });
                oDDTextParam.push({ CODE: "CUSTDEST" });
                oDDTextParam.push({ CODE: "DLVSEQ" });
                oDDTextParam.push({ CODE: "REVDLVDT" });
                oDDTextParam.push({ CODE: "INFO_CREATE_CHECK_REQD" });
                oDDTextParam.push({ CODE: "ERR_IORELEASE_REQ" });
                oDDTextParam.push({ CODE: "ERR_IOALREADYRELEASE" });
                oDDTextParam.push({ CODE: "PLACEHOLDER_REQ" });
                oDDTextParam.push({ CODE: "INFO_INVALID_CREATE_INFOREC" });
                oDDTextParam.push({ CODE: "PLANDLVDT_ERR_VALIDATION" });
                oDDTextParam.push({ CODE: "ERR_CUSTDLVDT_REQUIRED" });

                // console.log(oDDTextParam);

                setTimeout(() => {
                    oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam }, {
                        method: "POST",
                        success: function (oData, oResponse) {
                            // console.log(oData);
                            oData.CaptionMsgItems.results.forEach(item => {
                                oDDTextResult[item.CODE] = item.TEXT;
                            })

                            oJSONModelDDText.setData(oDDTextResult);
                            me.getView().setModel(oJSONModelDDText, "ddtext");
                            me.getOwnerComponent().getModel("CAPTION_MSGS_MODEL").setData({ oDDTextResult })

                            // console.log("oJSONModelDDText");
                            // console.log(oJSONModelDDText);
                        },
                        error: function (err) {
                            // sap.m.MessageBox.error(err);
                        }
                    });
                }, 100);
            },

            setRequiredFields: function () {
                // sap.ui.getCore().byId("STYLECD")._oLabel.addStyleClass("requiredField");
                // sap.ui.getCore().byId("STYLECD").addStyleClass("requiredField");
            },

            refreshIOData: async function (ioNo) {
                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve(this.getIOSizes());
                    }, 100);
                });
                await _promiseResult;

                // console.log("getIOATTRIBData");
                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve(this.getIOATTRIBData(ioNo));
                        this._bIOATTRIBChanged = false;
                    }, 100);
                });
                await _promiseResult;

                // console.log("getIOSTATUSData");
                _promiseResult = new Promise((resolve, reject) => {
                    resolve(this.getIOSTATUSData(ioNo));
                    this._bIOSTATUSChanged = false;
                });
                await _promiseResult;

                // console.log("getIODLVData");
                _promiseResult = new Promise((resolve, reject) => {
                    resolve(this.getIODLVData(ioNo));
                });
                await _promiseResult;

                _promiseResult = new Promise((resolve, reject) => {
                    resolve(this.getIODETMATLSTData(ioNo, this.getView().getModel("ui2").getProperty("/currDlvSeq")));
                });
                await _promiseResult;

                this.initIODETColumns();

                // console.log("111");
                // console.log(this.getView().getModel());

                this.initStyle();
                this.initIOMatList();
                this.initIOCosting();
            },

            initIODETColumns: async function () {
                // this.getView().getModel("ui2").setProperty("/currIONo", "1");
                // this.getView().getModel("ui2").setProperty("/currDlvSeq", "1");

                var me = this;
                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();

                await this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);

                this._tblChange = false;
            },

            onIODLVCellClick: async function (oEvent) {
                // // console.log(oEvent.getParameters().rowBindingContext.sPath);
                // if (oEvent.getParameters().rowBindingContext.sPath === undefined)
                //     return;

                if (!oEvent.getParameters().rowBindingContext) {
                    // console.log("oEvent.getParameters().rowBindingContext");
                    return;
                }


                if (this._bIODETChanged === true) {
                    // console.log(_bIODETChanged);
                    return;
                }

                if (this.byId("btnSaveDlvSched").Visible === true) {
                    // alert("btnSaveDlvSched");
                    // console.log("btnSaveDlvSched");
                    return;
                }

                //control based on value of _EditIODet

                var sRowPath = oEvent.getParameters().rowBindingContext.sPath;

                var oTable = this.byId("IODLVTab");
                oTable.getModel().getData().rows.forEach(row => row.ACTIVE = "");
                oTable.getModel().setProperty(sRowPath + "/ACTIVE", "X");

                oTable.getRows().forEach(row => {
                    if (row.getBindingContext() && row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.replace("/rows/", "")) {
                        row.addStyleClass("activeRow");
                    }
                    else row.removeStyleClass("activeRow")
                })

                sRowPath = "/rows/" + sRowPath.split("/")[2];
                // var oRow = this.getView().getModel("IODLVModel").getProperty(sRowPath);
                // console.log(this.getView().byId("IODLVTab"));
                var oRow = this.getView().byId("IODLVTab").getModel().getProperty(sRowPath);

                //NEW ROW, DO NOT CONTINUE
                if (oRow.IONO === undefined) {
                    return;
                }

                //IF IN EDIT MODE, DO NOT CONTINUE
                if (this._dataMode === "EDIT") {
                    return;
                }

                // alert("on Cell Click IO DLV");

                // console.log("Row Path");
                // console.log(oRow.IONO);
                // console.log(oRow.DLVSEQ);

                Common.openLoadingDialog(this);

                // this.getView().getModel("ui2").setProperty("/currIONo", oRow.IONO);
                this.getView().getModel("ui2").setProperty("/currDlvSeq", oRow.DLVSEQ);

                var vIONo = this.getView().getModel("ui2").getProperty("/currIONo");
                var vDlvSeq = this.getView().getModel("ui2").getProperty("/currDlvSeq");
                // alert(vIONo + " " + vDlvSeq);

                var me = this;
                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();

                // _promiseResult = new Promise((resolve, reject) => {
                //     me._tblChange = true;
                //     // setTimeout(() => {
                //     this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);
                //     // }, 100);
                //     resolve();
                // })
                // await _promiseResult;

                // _promiseResult = new Promise((resolve, reject) => {
                //     me._tblChange = true;
                //     // setTimeout(() => {
                //     this.getIODynamicColumns("IODETMATLST", "ZVB_IODETMATLIST", "iodetMatTab", oColumns);
                //     // }, 100);
                //     resolve();
                // })
                // await _promiseResult;

                me._tblChange = true;
                await this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);
                // await this.getIODynamicColumns("IODETMATLST", "ZDV_IODETMATLIST", "iodetMatTab", oColumns);

                Common.closeLoadingDialog(this);

                this._tblChange = false;
            },

            onfragmentImportPO: async function (tableName) {
                var me = this;
                var sTableName = tableName;

                var oParam = {};
                var oParamHdr = {};
                var oParamData = [];
                var oParamImportMSG = [];

                var oModel = this.getOwnerComponent().getModel();
                var oTable = sap.ui.getCore().byId(sTableName);
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel("IMPORTPODataModel").getData().results;

                if (oSelectedIndices.length <= 0) {
                    MessageBox.information("No selected row to process.");
                    return;
                }

                Common.openLoadingDialog(me);

                if (oSelectedIndices.length > 0) {
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    oSelectedIndices = oTmpSelectedIndices;

                    oParamHdr = {
                        IONO: this.getView().getModel("ui2").getProperty("/currIONo")
                    }

                    var aSelectedItems = [];
                    oSelectedIndices.forEach(item => {
                        // alert(aData.at(item).STYLENO);
                        // sStyleNo = aData.at(item).STYLENO;
                        aSelectedItems.push(aData.at(item));

                        oParamData.push({
                            // Saldocno: aData.at(item).SALESDOCNO === undefined ? "" : aData.at(item).SALESDOCNO,
                            // Saldocitem: aData.at(item).SALESDOCITEM === undefined ? "" : aData.at(item).SALESDOCITEM,
                            // Orderqty: aData.at(item).QTY === undefined ? "" : aData.at(item).QTY,
                            // Unitprice: aData.at(item).UNITPRICE === undefined ? "" : aData.at(item).UNITPRICE,
                            // Cpono: aData.at(item).CPONO === undefined ? "" : aData.at(item).CPONO,
                            // Cporev: aData.at(item).CPOREV === undefined ? "" : aData.at(item).CPOREV,
                            // Cpodt: aData.at(item).CPODT === undefined ? "" : sapDateFormat.format(new Date(aData.at(item).CPODT)),
                            // Dlvdt: aData.at(item).DLVDT === undefined ? "" : sapDateFormat.format(new Date(aData.at(item).DLVDT)),
                            // Styleno: aData.at(item).STYLENO === undefined ? "" : aData.at(item).STYLENO,
                            // Custcolor: aData.at(item).CUSTCOLOR === undefined ? "" : aData.at(item).CUSTCOLOR,
                            // Custsize: aData.at(item).CUSTSIZE === undefined ? "" : aData.at(item).CUSTSIZE,
                            // Custshipto: aData.at(item).CUSTSHIPTO === undefined ? "" : aData.at(item).CUSTSHIPTO,
                            // Custbillto: aData.at(item).CUSTBILLTO === undefined ? "" : aData.at(item).CUSTBILLTO

                            CPONO: aData.at(item).CPONO === undefined ? "" : aData.at(item).CPONO,
                            CPOREV: aData.at(item).CPOREV === undefined ? "" : aData.at(item).CPOREV,
                            CPODT: aData.at(item).CPODT === undefined ? "" : sapDateFormat.format(new Date(aData.at(item).CPODT)),
                            CUSTSTYLE: aData.at(item).CUSTSTYLE === undefined ? "" : aData.at(item).CUSTSTYLE
                        })
                    })

                    oParam = oParamHdr;
                    oParam['N_IMPORT_CPO'] = oParamData;
                    oParam['N_EXPORT_MSG'] = oParamImportMSG;

                    console.log(oParam);
                }

                // Common.closeLoadingDialog(that);
                // return;

                _promiseResult = new Promise((resolve, reject) => {
                    oModel.create("/IMPORTSALDOC2Set", oParam, {
                        method: "POST",
                        success: function (oData, oResponse) {
                            Common.closeLoadingDialog(me);
                            console.log(oData);
                            MessageBox.success("Sales Document Item/s Successfully added.");
                            resolve();
                        }, error: function (error) {
                            Common.closeLoadingDialog(me);
                            MessageBox.error("Error Encountered in Process!");
                            resolve();
                        }
                    })
                })
                await _promiseResult;

                await this.refreshHeaderData();
                // me.getView().getId("ORDQTY").value = me.getView().getModel("headerData").getData()["ORDQTY"];
                // me.getView().getId("REVORDQTY").value = me.getView().getModel("headerData").getData()["REVORDQTY"];
                await this.reloadIOData('IODLVTab', '/IODLVSet');
                this._bIODLVChanged = false;
                await this.reloadIOData('IODETTab', '/IODETSet');
                this._bIODETChanged = false;

                this.onCancelImportPO();
            },

            getImportPOData: async function () {
                var me = this;
                var oView = this.getView();
                var oJSONModel = new JSONModel();
                var currStyle = this.getView().getModel("ui2").getProperty("/currStyleNo");

                // var currCustSoldTo = this.getView().byId("SOLDTOCUST").getValue();
                var currCUSTGRP = this.getView().byId("CUSTGRP").getValue();

                // alert(currStyle);
                // alert(currCustSoldTo);

                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this._oModel.read('/IMPORTPO2Set', {
                            urlParameters: {
                                "$filter": "CUSTGRP eq '" + currCUSTGRP + "'"
                            },
                            // urlParameters: {
                            //     "$filter": "STYLENO eq '" + currStyle + "' and CUSTSOLDTO eq '" + currCustSoldTo + "'"
                            // },

                            success: function (oData, response) {
                                // console.log("Import PO Data");
                                // console.log(oData);
                                oData.results.forEach(item => {
                                    item.CPODT = dateFormat.format(new Date(item.CPODT));
                                    // item.DLVDT = dateFormat.format(new Date(item.DLVDT));
                                })

                                oJSONModel.setData(oData);
                                oView.setModel(oJSONModel, "IMPORTPODataModel");
                                // console.log(oView.setModel(oJSONModel, "IMPORTPODataModel"));

                                me.setSearchTableData("ImportPOTab");
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        })
                    }, 100);
                });
                await _promiseResult;
            },

            setSearchTableData: function (tableName) {
                var me = this;
                var sTabId = tableName;

                var oColumnsModel;
                var oDataModel;

                //the selected dynamic columns
                if (sTabId === "IOStyleSelectTab") {
                    oColumnsModel = this.getView().getModel("IOSTYLISTColumns");
                    oDataModel = this.getView().getModel("IOSTYSELDataModel");
                }

                if (sTabId === "IOSDSelectTab") {
                    oColumnsModel = this.getView().getModel("IOSDLISTColumns");
                    oDataModel = this.getView().getModel("IOSDSELDataModel");
                }

                if (sTabId === "ImportPOTab") {
                    // console.log("ImportPOTab Columns Model");
                    // console.log(this.getView());
                    oColumnsModel = this.getView().getModel("IMPORTPOColumns");
                    oDataModel = this.getView().getModel("IMPORTPODataModel");
                }

                // console.log(oColumnsModel);
                // console.log(oDataModel);

                //the selected styles data
                // console.log(oColumnsModel);
                var oColumnsData = oColumnsModel.getProperty('/results');
                var oData = oDataModel.getProperty('/results');

                // //add column for manage button
                // oColumnsData.unshift({
                //     "ColumnName": "Manage",
                //     "ColumnType": "SEL",
                //     "Visible": false
                // });

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({
                    columns: oColumnsData,
                    rows: oData
                });

                var oDelegateKeyUp = {
                    onkeyup: function (oEvent) {
                        that.onKeyUp(oEvent);
                    },

                    onsapenter: function (oEvent) {
                        that.onSapEnter(oEvent);
                    }
                };

                // this.byId("IODynTable").addEventDelegate(oDelegateKeyUp);
                // sap.ui.getCore().byId("IOStyleSelectTab").addEventDelegate(oDelegateKeyUp);

                // var oTable = sap.ui.getCore().byId("IOStyleSelectTab");
                var oTable;
                var oColumnsModel;
                var oDataModel;

                if (sTabId === "IOStyleSelectTab") {
                    sap.ui.getCore().byId("IOStyleSelectTab").addEventDelegate(oDelegateKeyUp);
                    oTable = sap.ui.getCore().byId("IOStyleSelectTab");
                    oColumnsModel = this.getView().getModel("IOSTYLISTColumns");
                    oDataModel = this.getView().getModel("IOSTYSELDataModel");
                }

                if (sTabId === "ImportPOTab") {
                    sap.ui.getCore().byId("ImportPOTab").addEventDelegate(oDelegateKeyUp);
                    oTable = sap.ui.getCore().byId("ImportPOTab");
                    oColumnsModel = this.getView().getModel("IMPORTPOColumns");
                    oDataModel = this.getView().getModel("IMPORTPODataModel");
                }

                if (sTabId === "IOSDSelectTab") {
                    sap.ui.getCore().byId("IOSDSelectTab").addEventDelegate(oDelegateKeyUp);
                    oTable = sap.ui.getCore().byId("IOSDSelectTab");
                    oColumnsModel = this.getView().getModel("IOSDLISTColumns");
                    oDataModel = this.getView().getModel("IOSDSELDataModel");
                }

                oTable.setModel(oModel);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnWidth = context.getObject().ColumnWidth; ``
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    // var sColumnToolTip = context.getObject().Tooltip;

                    // console.log(context.getObject());

                    return new sap.ui.table.Column({
                        // id: sColumnId,
                        label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),  //sColumnLabel, //"{i18n>" + sColumnId + "}",
                        template: me.columnTemplate(sColumnId, sColumnType),
                        // width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
                        width: sColumnWidth + 'px',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });

                //bind the data to the table
                oTable.bindRows("/rows");
            },

            onImportPO: async function (source) {
                var me = this;
                var sSource = source;
                var hasData = false;
                if (sSource === "IODLVTab") {

                    var currStyle = this.getView().getModel("ui2").getProperty("/currStyleNo");
                    var currCustSoldTo = this.getView().byId("SOLDTOCUST").getValue();
                    // _promiseResult = new Promise((resolve, reject) => {
                    //     setTimeout(() => {
                    //         this._oModel.read('/IMPORTPOSet', {
                    //             urlParameters: {
                    //                 "$filter": "STYLENO eq '" + currStyle + "' and CUSTSOLDTO eq '" + currCustSoldTo + "'"
                    //             },
                    //             success: function (oData, response) {
                    //                 if (oData.results.length > 0) {
                    //                     hasData = true;
                    //                 }
                    //                 resolve();
                    //                 return;
                    //             },
                    //             error: function (err) {
                    //                 MessageBox.error("Error encountered: " + err.responseText);
                    //                 resolve();
                    //             }
                    //         })
                    //     }, 100);
                    // });
                    // await _promiseResult;

                    // if (!hasData) {
                    //     MessageBox.information("No Sales Document Data found for Style# " + currStyle + " and Sold-To Customer# " + currCustSoldTo + "");
                    //     return;
                    // }
                    // else {
                    //     await this.reloadIOData("IODLVTab", "/IODLVSet");
                    //     this._bIODLVChanged = false;

                    //     me._tblChange = true;
                    //     // setTimeout(() => {
                    //     await this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);
                    //     me._tblChange = false;

                    //     // do not continue with fragment initialization / no data to select
                    //     // return;
                    // }

                    await this.lock(this);
                    if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {
                        if (!me._ImportPODialog) {
                            // console.log("initialize Import PO Dialog");
                            me._ImportPODialog = sap.ui.xmlfragment("zuiio2.view.fragments.ImportPO", me);
                            // me.getView().addDependent(me._ImportPODialog);

                            var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                            var oModelColumns = new JSONModel();
                            await oModelColumns.loadData(sPath);

                            var oColumns = oModelColumns.getData();

                            var oTable = sap.ui.getCore().byId("ImportPOTab");
                            oTable.setModel(new JSONModel({
                                columns: [],
                                rows: []
                            }));

                            this.getSearchDynamicTableColumns("IMPORTPO2", "ZDV_IMPORT_PO2", "ImportPOTab", oColumns);

                            me.getView().addDependent(me._ImportPODialog);

                        }
                        me._ImportPODialog.open();
                    } else
                        MessageBox.error(this.getView().getModel("ui").getProperty("/LockMessage"));
                }
            },

            getSearchDynamicTableColumns: function (arg1, arg2, arg3, arg4) {
                var me = this;
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();

                // this._sbu = this.getView().byId("smartFilterBar").getFilterData().SBU.Text;  //get selected SBU

                // console.log(this._sbu);
                // this._sbu = this.getView().byId("cboxSBU").getSelectedKey();
                // this._sbu = 'VER';
                oModel.setHeaders({
                    sbu: this._sbu,
                    type: sType,
                    tabname: sTabName
                });

                //DynamicColumnsSet
                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        if (oData.results.length > 0) {
                            // console.log("Import PO");
                            // console.log(oData);

                            var aColumns;

                            if (sTabId === "IOStyleSelectTab")
                                aColumns = me.setTableColumns(oLocColProp["iostylist"], oData.results);

                            if (sTabId === "IOSDSelectTab")
                                aColumns = me.setTableColumns(oLocColProp["iosdlist"], oData.results);

                            if (sTabId === "ImportPOTab")
                                aColumns = me.setTableColumns(oLocColProp["importpolist"], oData.results);

                            if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                                oData.results.forEach(item => {
                                    oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                        .forEach(col => item.ValueHelp = col.ValueHelp)
                                })
                            }

                            me._aIOColumns[sTabId.replace("Tab", "")] = oData.results;
                            me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                            // console.log(me._aColumns[sTabId.replace("Tab", "")]);
                            
                            //me._aFilterableColumns[sTabId.replace("Tab", "")] = aColumns["filterableColumns"];

                            // console.log("io style list filterable columns");
                            // console.log(me._aFilterableColumns["iostylist"]);

                            me.setIOSearchTableColumns(sTabId, oData.results);

                            oJSONColumnsModel.setData(oData);

                            // console.log("/ColumnsSet");
                            // console.log(oJSONColumnsModel);

                            me.oJSONModel.setData(oData);

                            // me.getView().setModel(oJSONColumnsModel, "IOSTYLISTColumns");  //set the view model
                            // me.getIOSTYLISTData();

                            if (sTabId === "IOStyleSelectTab") {
                                me.getView().setModel(oJSONColumnsModel, "IOSTYLISTColumns");  //set the view model
                                me.getIOSTYLISTData();
                            }


                            if (sTabId === "IOSDSelectTab") {
                                me.getView().setModel(oJSONColumnsModel, "IOSDLISTColumns");  //set the view model
                                me.getIOSDLISTData();
                            }

                            if (sTabId === "ImportPOTab") {
                                // console.log(oJSONColumnsModel);
                                me.getView().setModel(oJSONColumnsModel, "IMPORTPOColumns");  //set the view model
                                me.getImportPOData();
                            }
                        }
                    },
                    error: function (err) { }
                });
            },

            setIOSearchTableColumns: function (arg1, arg2) {
                var me = this;
                var sTabId = arg1;
                var oColumns = arg2;
                // var oTable = me.getView().byId(sTabId);
                var oTable = sap.ui.getCore().byId(sTabId);

                // console.log("setIOSearchTableColumns");
                // console.log(oTable);

                oTable.getModel().setProperty("/columns", oColumns);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnDataType = context.getObject().DataType;

                    if (sColumnWidth === 0) sColumnWidth = 100;
                    // console.log(sColumnDataType);

                    if (sColumnDataType === "STRING") {
                        return new sap.ui.table.Column({
                            id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),  //sColumnLabel,
                            template: new sap.m.Text({
                                text: "{" + sColumnId + "}",
                                wrapping: false
                                // , 
                                // tooltip: "{" + sColumnId + "}"
                            }),
                            width: sColumnWidth + "px",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                        });
                    } else if (sColumnDataType === "BOOLEAN") {
                        // console.log("BOOLEAN : " + sColumnId);
                        return new sap.ui.table.Column({
                            id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),  //sColumnLabel,
                            template: new sap.m.CheckBox({
                                selected: "{" + sColumnId + "}",
                                editable: false
                            }),
                            width: sColumnWidth + "px",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            hAlign: "Center",
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                        });
                    } else {
                        // console.log(sColumnDataType + " : " + sColumnId);
                        return new sap.ui.table.Column({
                            id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),  //sColumnLabel,
                            template: new sap.m.Text({
                                text: "{" + sColumnId + "}",
                                wrapping: false
                                // , 
                                // tooltip: "{" + sColumnId + "}"
                            }),
                            width: sColumnWidth + "px",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                        });
                    }
                });
            },

            getIODETMATLSTData: async function (iono, dlvseq) {
                var me = this;
                // var ioNo = iono;
                // var IONo = this.getView().getModel("ui2").getProperty("/currIONo");
                // var DlvSeq = this.getView().getModel("ui2").getProperty("/currDlvSeq");

                var IONo = iono;
                var DlvSeq = dlvseq;

                if (IONo === "NEW")
                    return;

                // console.log("getIODETMATLSTData");
                // console.log(ioNo);

                // console.log(IONo);
                // console.log(DlvSeq);

                await new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this._oModel.read('/IODETMATLSTSet', {
                            urlParameters: {
                                "$filter": "IONO eq '" + IONo + "' and DLVSEQ eq " + DlvSeq
                            },
                            success: function (oData, response) {
                                // console.log("getIODETMATLSTData");
                                // console.log(oData);

                                me.byId("iodetMatTab").getModel().setProperty("/rows", oData.results);
                                me.byId("iodetMatTab").bindRows("/rows");
                                me._tableRendered = "iodetMatTab";
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        })
                    }, 100);
                });

                // console.log(me.getView().getModel("ui2").getProperty("/currDlvSeq"));
            },

            getIODLVData: async function (iono) {
                var me = this;
                // var ioNo = iono;
                var ioNo = this.getView().getModel("ui2").getProperty("/currIONo");

                if (ioNo === "NEW")
                    return;

                // console.log("getIODLVData");
                // console.log(ioNo);
                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this._oModel.read('/IODLVSet', {
                            urlParameters: {
                                "$filter": "IONO eq '" + ioNo + "'"
                            },
                            success: function (oData, response) {
                                // console.log("getIODLVData");
                                // console.log(oData);
                                oData.results.forEach(item => {
                                    item.CPODT = item.CPODT === "0000-00-00" || item.CPODT === "    -  -  " ? "" : dateFormat.format(new Date(item.CPODT));
                                    item.DLVDT = item.DLVDT === "0000-00-00" || item.DLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.DLVDT));
                                    item.REVDLVDT = item.REVDLVDT === "0000-00-00" || item.REVDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.REVDLVDT));
                                    item.CREATEDDT = item.CREATEDDT === "0000-00-00" || item.CREATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.CREATEDDT));
                                    item.UPDATEDDT = item.UPDATEDDT === "0000-00-00" || item.UPDATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.UPDATEDDT));
                                    item.DELETED = item.DELETED === "X" ? true : false;
                                })
                                oData.results.forEach((item, index) => {
                                    if (index === 0) {
                                        item.ACTIVE = "X"
                                        // me.getView().getModel("ui2").setProperty("/currIONo", item.IONO === undefined ? "" : item.IONO);
                                        me.getView().getModel("ui2").setProperty("/currDlvSeq", item.DLVSEQ === undefined ? "999" : item.DLVSEQ);
                                    } else
                                        item.ACTIVE = ""
                                });

                                oData.results.sort((a, b,) => (a.DLVSEQ > b.DLVSEQ ? -1 : 1));

                                me.byId("IODLVTab").getModel().setProperty("/rows", oData.results);
                                me.byId("IODLVTab").bindRows("/rows");
                                me._tableRendered = "IODLVTab";
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        })
                    }, 100);
                });
                await _promiseResult;

                // console.log(me.getView().getModel("ui2").getProperty("/currDlvSeq"));
            },

            setTableColumns: function (arg1, arg2) {
                var oColumn = arg1;
                var oMetadata = arg2;

                // console.log(oColumn);
                // console.log(oMetadata);

                var aSortableColumns = [];
                var aFilterableColumns = [];
                var aColumns = [];

                oMetadata.sort((a, b) => (+a.Order > +b.Order ? 1 : -1));

                oMetadata.forEach((item, index) => {
                    item.Order = index;
                });

                oMetadata.forEach((prop, idx) => {
                    var vCreatable = prop.Editable;
                    var vUpdatable = prop.Editable;
                    var vSortable = true;
                    var vSorted = prop.Sorted;
                    var vSortOrder = prop.SortOrder;
                    var vFilterable = true;
                    var vName = prop.ColumnLabel;
                    var oColumnLocalProp = oColumn.filter(col => col.name.toUpperCase() === prop.ColumnName);
                    var vShowable = true;
                    var vOrder = prop.Order;

                    // console.log(prop)
                    if (vShowable) {
                        //sortable
                        if (vSortable) {
                            aSortableColumns.push({
                                name: prop.ColumnName,
                                label: vName,
                                position: +vOrder,
                                sorted: vSorted,
                                sortOrder: vSortOrder
                            });
                        }

                        //filterable
                        if (vFilterable) {
                            aFilterableColumns.push({
                                name: prop.ColumnName,
                                label: vName,
                                position: +vOrder,
                                value: "",
                                connector: "Contains"
                            });
                        }
                    }

                    //columns
                    aColumns.push({
                        name: prop.ColumnName,
                        label: vName,
                        position: +vOrder,
                        type: prop.DataType,
                        creatable: vCreatable,
                        updatable: vUpdatable,
                        sortable: vSortable,
                        filterable: vFilterable,
                        visible: prop.Visible,
                        required: prop.Mandatory,
                        width: prop.ColumnWidth + 'rem',
                        sortIndicator: vSortOrder === '' ? "None" : vSortOrder,
                        hideOnChange: false,
                        valueHelp: oColumnLocalProp.length === 0 ? { "show": false } : oColumnLocalProp[0].valueHelp,
                        showable: vShowable,
                        key: prop.Key === '' ? false : true,
                        maxLength: prop.Length,
                        precision: prop.Decimal,
                        scale: prop.Scale !== undefined ? prop.Scale : null
                    })
                })

                // aSortableColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                // this.createViewSettingsDialog("sort", 
                //     new JSONModel({
                //         items: aSortableColumns,
                //         rowCount: aSortableColumns.length,
                //         activeRow: 0,
                //         table: ""
                //     })
                // );

                // aFilterableColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                // this.createViewSettingsDialog("filter", 
                //     new JSONModel({
                //         items: aFilterableColumns,
                //         rowCount: aFilterableColumns.length,
                //         table: ""
                //     })
                // );

                // aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                // var aColumnProp = aColumns.filter(item => item.showable === true);

                // this.createViewSettingsDialog("column", 
                //     new JSONModel({
                //         items: aColumnProp,
                //         rowCount: aColumnProp.length,
                //         table: ""
                //     })
                // );


                return { columns: aColumns, sortableColumns: aSortableColumns, filterableColumns: aFilterableColumns };
            },

            // getIODETData: async function () {
            //     var me = this;
            //     // var ioNo = iono;
            //     var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");
            //     var cDlvSeq = this.getView().getModel("ui2").getProperty("/currDlvSeq");

            //     _promiseResult = new Promise((resolve, reject) => {
            //         setTimeout(() => {
            //             this._oModel.read('/IODETSet', {
            //                 urlParameters: {
            //                     "$filter": "IONO eq '" + cIONo + "' and DLVSEQ eq '" + cDlvSeq + "'"
            //                 },
            //                 success: function (oData, response) {
            //                     me.byId("IODETTab").getModel().setProperty("/rows", oData.results);
            //                     me.byId("IODETTab").bindRows("/rows");
            //                     resolve();
            //                 },
            //                 error: function (err) {
            //                     resolve();
            //                 }
            //             })
            //         }, 100);
            //     });
            //     await _promiseResult;
            // },

            getIOATTRIBData: async function (iono) {
                // console.log("IO ATTRIB");
                var me = this;
                var ioNo = iono;
                // var ioNo = this.getView().getModel("ui2").getProperty("/currIONo");
                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this._oModel.read("/IOATTRIBSet", {
                            urlParameters: {
                                "$filter": "IONO eq '" + ioNo + "'"
                            },
                            success: function (oData, response) {
                                // console.log("ATTRIBSet");
                                // console.log(oData.results);
                                oData.results.forEach((item, index) =>
                                    item.ACTIVE = index === 0 ? "X" : "");

                                // oData.results.forEach(item => {
                                //     item.CREATEDDT = item.CREATEDDT === "0000-00-00" || item.CPODT === "    -  -  " ? "" : dateFormat.format(new Date(item.CREATEDDT));
                                //     item.UPDATEDDT = item.UPDATEDDT === "0000-00-00" || item.CPODT === "    -  -  " ? "" : dateFormat.format(new Date(item.UPDATEDDT));
                                    // item.CREATEDTM = timeFormat.format(new Date(item.CREATEDTM.ms + TZOffsetMs));
                                    // item.UPDATEDTM = timeFormat.format(new Date(item.UPDATEDTM.ms + TZOffsetMs));
                                // })

                                me.byId("IOATTRIBTab").getModel().setProperty("/rows", oData.results);
                                me.byId("IOATTRIBTab").bindRows("/rows");
                                me._tableRendered = "IOATTRIBTab";

                                // me._iosizes = oData.results;

                                // console.log("IO Sizes");
                                // console.log(me._iosizes);
                                // console.log("IO Sizes from get IO Attrib");
                                // console.log(me._iosizes);
                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        })
                    }, 100);
                });
                await _promiseResult;
            },

            getIOSTATUSData: async function (iono) {
                var me = this;
                var ioNo = iono;
                // var ioNo = this.getView().getModel("ui2").getProperty("/currIONo");
                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this._oModel.read("/IOSTATSet", {
                            urlParameters: {
                                "$filter": "IONO eq '" + ioNo + "'"
                            },
                            success: function (oData, response) {
                                // console.log("IO Status Data");
                                // console.log(oData);

                                oData.results.forEach(item => {
                                    item.UPDATEDDT = item.UPDATEDDT === "0000-00-00" || item.UPDATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.UPDATEDDT));
                                    item.UPDATEDTM = timeFormat.format(new Date(item.UPDATEDTM.ms + TZOffsetMs));
                                })

                                oData.results.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");
                                me.byId("IOSTATUSTab").getModel().setProperty("/rows", oData.results);
                                me.byId("IOSTATUSTab").bindRows("/rows");
                                me._tableRendered = "IOSTATUSTab";

                                resolve();
                            },
                            error: function (err) {
                                resolve();
                            }
                        })
                    }, 100);
                });
                await _promiseResult;
            },

            getIOSTYLISTData: function (pstyleno) {
                var me = this;
                var oView = this.getView();
                var pStyleNo = pstyleno;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();

                var entitySet = "/IOSTYLISTDETSet"

                // //Attachments
                // this.bindUploadCollection();
                // this.getView().getModel("FileModel").refresh();

                // this.getView().setModel(new JSONModel({
                //     dataMode: "INIT",
                //     today: ""
                // }), "ui");
                setTimeout(() => {
                    oModel.read(entitySet, {
                        urlParameters: {
                            "$filter": "STYLENO eq '" + pStyleNo + "'"
                        },
                        success: function (oData, oResponse) {
                            console.log("IOSTYLISTDETSet");
                            console.log(oData);
                            oData.results.forEach(item => {

                                var styleData = {
                                    "STYLECD": item.STYLECD,
                                    "STYLENO": item.STYLENO,
                                    "STYLECAT": item.STYLECAT,
                                    "VERNO": item.VERNO,
                                    "PRODTYPE": item.PRODTYP,
                                    "SALESGRP": item.SALESGRP,
                                    "SEASONCD": item.SEASONCD,
                                    "CUSTGRP": item.CUSTGRP,
                                    "BASEUOM": item.UOM,
                                    "SOLDTOCUST": item.SOLDTOCUST,
                                    "ORDQTY": 0,
                                    "ACTUALQTY": 0,
                                    "REVORDQTY": 0,
                                    "SHIPQTY": 0,
                                    "PLANQTY": 0
                                }
                                oJSONModel.setData(styleData);
                                oView.setModel(oJSONModel, "headerData");
                            })

                        },
                        error: function () { }
                    });
                }, 100);
            },

            // getIODETColumnData: async function (arg1, arg2) {
            //     // console.log("IO ATTRIB");
            //     var me = this;
            //     var sType = arg1;
            //     var sTabName = arg2;
            //     var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
            //     var vSBU = this.getView().getModel("ui2").getProperty("/sbu");
            //     var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");


            //     // console.log(vSBU);
            //     // console.log(sType);
            //     // console.log(sTabName);

            //     oModel.setHeaders({
            //         sbu: vSBU,
            //         type: sType,
            //         tabname: sTabName
            //     });

            //     // _promiseResult = new Promise((resolve, reject) => {
            //     setTimeout(() => {
            //         oModel.read("/ColumnsSet", {
            //             success: function (oData, response) {
            //                 // me._ccolumns = oData.results;
            //                 // console.log("getIODETColumnData");
            //                 // console.log(me._ccolumns);
            //                 oJSONColumnsModel.setData(oData);
            //                 me.getView().setModel(oJSONColumnsModel, "currIODETModel");
            //                 // resolve();
            //             },
            //             error: function (err) {
            //                 // resolve();
            //             }
            //         })
            //     }, 100);
            //     // });
            //     // await _promiseResult;
            // },

            getIOColumnProp: async function () {
                // var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                // var oModelColumns = new JSONModel();
                // await oModelColumns.loadData(sPath);

                // _promiseResult = new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.getReloadIOColumnProp();
                }, 100);
                // });
                // await _promiseResult;

                // FA Summary
                FASummary.onInit(this);
                //console.log("fadcsend2", sap.ui.getCore().byId("dcSendDetailTab"), this.getView().byId("dcSendDetailTab"))
            },

            getReloadIOColumnProp: async function () {
                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();
                // console.log(oColumns)

                // _promiseResult = new Promise((resolve, reject) => {
                //     setTimeout(() => {
                //         this._tblChange = true;
                //         // console.log("ZERP_IOSTATUS");
                //         this.getIODynamicColumns("IOSTAT", "ZERP_IOSTATUS", "IOSTATUSTab", oColumns);
                //     }, 100);
                //     resolve();
                // })
                // await _promiseResult;

                // _promiseResult = new Promise((resolve, reject) => {
                //     setTimeout(() => {
                //         this._tblChange = true;
                //         // console.log("ZERP_IOATTRIB");
                //         this.getIODynamicColumns("IOATTRIB", "ZERP_IOATTRIB", "IOATTRIBTab", oColumns);
                //     }, 100);
                //     resolve();
                // })
                // await _promiseResult;

                // _promiseResult = new Promise((resolve, reject) => {
                //     setTimeout(() => {
                //         this._tblChange = true;
                //         // console.log("ZDV_3DERP_IODLV");
                //         this.getIODynamicColumns("IODLV", "ZDV_3DERP_IODLV", "IODLVTab", oColumns);

                //     }, 100);
                //     resolve();
                // })
                // await _promiseResult;

                // _promiseResult = new Promise((resolve, reject) => {
                //     setTimeout(() => {
                //         this._tblChange = true;
                //         console.log("ZVB_IODETMATLIST");
                //         this.getIODynamicColumns("IODETMATLST", "ZDV_IODETMATLIST", "iodetMatTab", oColumns);

                //     }, 100);
                //     resolve();
                // })
                // await _promiseResult;

                // if (this.getView().getModel("ui2").getProperty("/currIONo") !== "NEW") {
                //     _promiseResult = new Promise((resolve, reject) => {
                //         setTimeout(() => {
                //             this._tblChange = true;
                //             // console.log("ZERP_IODET");
                //             this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);
                //         }, 100);
                //         resolve();
                //     })
                //     await _promiseResult;
                // }


                this._tblChange = true;
                // console.log("ZERP_IOSTATUS");
                await this.getIODynamicColumns("IODETMATLST", "ZDV_IODETMATLIST", "iodetMatTab", oColumns);
                await this.getIODynamicColumns("IOSTAT", "ZERP_IOSTATUS", "IOSTATUSTab", oColumns);
                await this.getIODynamicColumns("IOATTRIB", "ZERP_IOATTRIB", "IOATTRIBTab", oColumns);
                await this.getIODynamicColumns("IODLV", "ZDV_3DERP_IODLV", "IODLVTab", oColumns);


                if (this.getView().getModel("ui2").getProperty("/currIONo") !== "NEW") {
                    await this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);
                }

                this._tblChange = false;
            },

            getIOSizes: async function () {
                //get color attributes
                // console.log("IOATTRIBTYPSet 1");
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var vIONo = this.getView().getModel("ui2").getProperty("/currIONo");
                // console.log("getIOSizes");
                // console.log(vIONo);
                // console.log("IOATTRIBTYPSet 2");

                _promiseResult = new Promise((resolve, reject) => {
                    oModel.read("/IOATTRIBTYPSet", {
                        urlParameters: {
                            "$filter": "IONO eq '" + vIONo + "' and ATTRIBTYP eq 'SIZE'"
                        },
                        success: function (oData, oResponse) {
                            // console.log("IOATTRIBTYPSet");
                            // console.log(oData);
                            me._iosizes = oData.results;
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }

                    });
                })
                await _promiseResult;
            },

            getIOSTYSizes: function () {
                //get color attributes
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");

                oModel.setHeaders({
                    styleno: this._styleNo //"1000000272"
                });

                oModel.read("/StyleAttributesSizeSet", {
                    success: function (oData, oResponse) {
                        me._iosizes = oData.results;
                    },
                    error: function (err) { }
                });
            },

            // getIOSizes: function () {
            //     //get color attributes
            //     var me = this;
            //     var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");

            //     oModel.setHeaders({
            //         styleno: this._styleNo //"1000000272"
            //     });

            //     oModel.read("/StyleAttributesSizeSet", {
            //         success: function (oData, oResponse) {
            //             me._iosizes = oData.results;
            //         },
            //         error: function (err) { }
            //     });
            // },

            getIODynamicColumns: async function (arg1, arg2, arg3, arg4) {
                var me = this;
                var columnData = [];
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var o3DModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                // var vSBU = "VER"; //this.getView().getModel("ui2").getData().sbu;
                var vSBU = this._sbu;

                // console.log("COlumns Set " + arg1);

                if (arg1 === "IODET") {
                    var oJSONCommonDataModel = new sap.ui.model.json.JSONModel();
                    var oJSON3DDataModel = new sap.ui.model.json.JSONModel();
                    var oJSONModel = new sap.ui.model.json.JSONModel();

                    this._columns;
                    var columns;
                    var ccolumns;
                    var pivotArray;

                    // console.log("me._iosizes");
                    // console.log(me._iosizes);
                    pivotArray = me._iosizes;

                    // console.log("pivotArray");
                    // console.log(pivotArray);
                    // console.log(this._ccolumns);
                    // console.log(me._ccolumns);

                    // if(me._ccolumns === undefined) {
                    //     this.initIODETColumns();
                    //     return;
                    // }

                    // ccolumns = me._ccolumns;

                    // console.log("DC CC");
                    // console.log(ccolumns);

                    oModel.setHeaders({
                        sbu: vSBU,
                        type: sType,
                        tabname: sTabName
                    });

                    //get dynamic columns of IO Details pivoted by Size
                    _promiseResult = new Promise((resolve, reject) => {
                        // setTimeout(() => {
                        oModel.read("/ColumnsSet", {
                            success: function (oData, oResponse) {
                                if (oData.results.length > 0) {
                                    // console.log("IO DET Columns Set");
                                    // console.log(oData);
                                    oJSONCommonDataModel.setData(oData);
                                    me.getView().setModel(oJSONCommonDataModel, "currIODETModel");
                                    // this._columns = oData.results;                                    
                                }
                                resolve();
                            },
                            error: function (err) {
                                // Common.closeLoadingDialog(that);
                                resolve();
                            }
                        });
                        // }, 100);
                    });
                    await _promiseResult;

                    o3DModel.setHeaders({
                        sbu: vSBU,
                        type: sType
                        ,
                        usgcls: ""
                    });

                    //get dynamic columns of IO Details pivoted by Size
                    await new Promise((resolve, reject) => {
                        // setTimeout(() => {
                        o3DModel.read("/DynamicColumnsSet", {
                            success: function (oData, oResponse) {
                                if (oData.results.length > 0) {
                                    // console.log("Dynamic Columns Set");
                                    // console.log(oData);
                                    oJSON3DDataModel.setData(oData);
                                    me.getView().setModel(oJSON3DDataModel, "IODETPVTModel");

                                    // this._columns = oData.results;
                                }
                                resolve();
                            },
                            error: function (err) {
                                // Common.closeLoadingDialog(that);
                                resolve();
                            }
                        });
                        // }, 100);
                    });

                    var pivotRow;

                    // if (me.getView().getModel("IODETPVTModel") === undefined) {

                    // }
                    // console.log("Pivot Model");
                    // console.log(me.getView().getModel("IODETPVTModel"));
                    // console.log(me.getView().getModel("IODETPVTModel").getProperty("/results"));
                    // console.log("curr IODet Model");
                    // console.log(me.getView().getModel("currIODETModel"));
                    // console.log(me.getView().getModel("currIODETModel").getProperty("/results"));

                    // return;
                    columns = me.getView().getModel("IODETPVTModel").getProperty("/results");
                    ccolumns = me.getView().getModel("currIODETModel").getProperty("/results");

                    // console.log("PVT");
                    // console.log(columns);
                    // console.log("Original Columns");
                    // console.log(ccolumns);

                    // console.log(ccolumns);
                    // return;

                    //find the column to pivot  CUSTSIZE
                    for (var i = 0; i < columns.length; i++) {
                        if (columns[i].Pivot !== '') {
                            pivotRow = columns[i].Pivot;
                        }
                    }

                    // console.log("pivotRow");
                    // console.log(pivotRow);

                    //build the table dyanmic columns
                    for (var i = 0; i < columns.length; i++) {
                        // console.log(columns[i]);
                        if (columns[i].Pivot === pivotRow && columns[i].ColumnName === "REVORDERQTY") {
                            //pivot the columns
                            for (var j = 0; j < pivotArray.length; j++) {
                                if (pivotArray[j].ATTRIBTYP === "SIZE") {
                                    // console.log(ccolumns);
                                    columnData.push({
                                        "ColumnName": pivotArray[j].ATTRIBCD + ccolumns[i].ColumnName,
                                        "ColumnLabel": pivotArray[j].DESC1 + " " + ccolumns[i].ColumnLabel,
                                        "ColumnWidth": 120,
                                        "ColumnType": pivotRow,
                                        "DataType": ccolumns[i].DataType,
                                        "Editable": ccolumns[i].Editable,
                                        "Mandatory": columns[i].Mandatory,
                                        "Visible": true,
                                        "Creatable": ccolumns[i].Creatable,
                                        "Decimal": ccolumns[i].Decimal,
                                        "DictType": ccolumns[i].DictType,
                                        "Key": ccolumns[i].Key,
                                        "Length": ccolumns[i].Length,
                                        "Order": ccolumns[i].Length,
                                        "SortOrder": ccolumns[i].SortOrder,
                                        "SortSeq": ccolumns[i].SortSeq,
                                        "Sorted": ccolumns[i].Sorted
                                    })

                                    columnData.push({
                                        "ColumnName": pivotArray[j].ATTRIBCD + ccolumns[i + 1].ColumnName,
                                        "ColumnLabel": pivotArray[j].DESC1 + " " + ccolumns[i + 1].ColumnLabel,
                                        "ColumnWidth": 120,
                                        "ColumnType": pivotRow,
                                        "DataType": ccolumns[i + 1].DataType,
                                        "Editable": ccolumns[i + 1].Editable,
                                        "Mandatory": columns[i + 1].Mandatory,
                                        "Visible": true,
                                        "Creatable": ccolumns[i + 1].Creatable,
                                        "Decimal": ccolumns[i + 1].Decimal,
                                        "DictType": ccolumns[i + 1].DictType,
                                        "Key": ccolumns[i + 1].Key,
                                        "Length": ccolumns[i + 1].Length,
                                        "Order": ccolumns[i + 1].Length,
                                        "SortOrder": ccolumns[i + 1].SortOrder,
                                        "SortSeq": ccolumns[i + 1].SortSeq,
                                        "Sorted": ccolumns[i + 1].Sorted
                                    })

                                    columnData.push({
                                        "ColumnName": "IOITEM" + pivotArray[j].ATTRIBCD + ccolumns[i].ColumnName,
                                        "ColumnLabel": "IOITEM" + pivotArray[j].ATTRIBCD,
                                        "ColumnWidth": 70,
                                        "ColumnType": "",
                                        "DataType": "NUMMBER",
                                        "Editable": false,
                                        "Mandatory": "",
                                        "Visible": false,
                                        "Creatable": false,
                                        "Decimal": 0,
                                        "DictType": "",
                                        "Key": "",
                                        "Length": 0,
                                        "Order": "",
                                        "SortOrder": "",
                                        "SortSeq": "",
                                        "Sorted": false
                                    })
                                }
                            }
                        } else {
                            if (columns[i].ColumnName !== pivotRow && columns[i].ColumnName !== "IOITEM" && columns[i].ColumnName !== "IONO" && columns[i].ColumnName !== "SHIPQTY"
                                && columns[i].ColumnName !== "SALDOCNO" && columns[i].ColumnName !== "SALDOCITEM"
                                && columns[i].ColumnName !== "CREATEDBY" && columns[i].ColumnName !== "CREATEDDT" && columns[i].ColumnName !== "CREATEDTM"
                                && columns[i].ColumnName !== "UPDATEDBY" && columns[i].ColumnName !== "UPDATEDDT" && columns[i].ColumnName !== "UPDATEDTM") {
                                if (columns[i].Visible === true) {
                                    // console.log("ccolumns[i]");
                                    // console.log(ccolumns[i]);
                                    // console.log("CColumns loop");
                                    // console.log(ccolumns);

                                    // console.log(ccolumns[i].ColumnType);
                                    columnData.push({
                                        "ColumnName": ccolumns[i].ColumnName,
                                        "ColumnLabel": ccolumns[i].ColumnLabel,
                                        "ColumnWidth": ccolumns[i].ColumnWidth,
                                        "ColumnType": ccolumns[i].ColumnType,
                                        "DataType": ccolumns[i].DataType,
                                        "Editable": ccolumns[i].Editable,
                                        "Mandatory": ccolumns[i].Mandatory,
                                        "Visible": ccolumns[i].Visible,
                                        "Creatable": ccolumns[i].Creatable,
                                        "Decimal": ccolumns[i].Decimal,
                                        "DictType": ccolumns[i].DictType,
                                        "Key": ccolumns[i].Key,
                                        "Length": ccolumns[i].Length,
                                        "Order": ccolumns[i].Length,
                                        "SortOrder": ccolumns[i].SortOrder,
                                        "SortSeq": ccolumns[i].SortSeq,
                                        "Sorted": ccolumns[i].Sorted
                                    })
                                }
                            }
                        }
                    }

                    // console.log("column Data");
                    // console.log(columnData);
                    // me._aColumns[sTabId.replace("Tab", "")] = oData.results;

                    if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                        columnData.forEach(item => {
                            oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                .forEach(col => item.ValueHelp = col.ValueHelp)
                        })
                    }

                    me._aIOColumns[sTabId.replace("Tab", "")] = columnData;
                    me._aColumns[sTabId.replace("Tab", "")] = columnData;

                    oJSONModel.setData(columnData);
                    me.getView().setModel(oJSONModel, "columnData");

                    oJSONModel.setData(pivotArray);
                    me.getView().setModel(oJSONModel, "pivotArray");

                    await new Promise((resolve, reject) => {
                        // setTimeout(() => {
                        me.getIODETTableData(columnData, pivotArray);
                        // me.getIODETTableData();

                        // }, 100);
                        resolve();
                    });

                    //     },
                    //     error: function (err) {
                    //         Common.closeLoadingDialog(that);
                    //         resolve();
                    //     }
                    // });




                } else {
                    // console.log(vSBU + " - " + sType + " - " + sTabName);
                    oModel.setHeaders({
                        sbu: vSBU,
                        type: sType,
                        tabname: sTabName
                    });

                    await new Promise((resolve, reject) => {
                        oModel.read("/ColumnsSet", {
                            success: function (oData, oResponse) {
                                if (oData.results.length > 0) {
                                    // console.log("getIODynamicColumns " + sTabId);
                                    // console.log(oData.results);
                                    if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                                        oData.results.forEach(item => {
                                            oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                                .forEach(col => item.ValueHelp = col.ValueHelp)
                                        })
                                    }

                                    if (arg1 === "IOSTATUS") {
                                        // console.log("IO Status Data");
                                        // console.log(oData);
                                    }

                                    me._aIOColumns[sTabId.replace("Tab", "")] = oData.results;
                                    me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                                    // console.log(me._aColumns[sTabId.replace("Tab", "")]);
                                    me.setIOTableColumns(sTabId, oData.results);
                                    // Common.closeLoadingDialog();
                                    resolve();
                                }
                            },
                            error: function (err) {
                                // Common.closeLoadingDialog();
                                resolve();
                            }
                        });
                    });
                }


            },

            setIOTableColumns: function (arg1, arg2) {
                var me = this;
                var sTabId = arg1;
                var oColumns = arg2;
                var oTable = this.getView().byId(sTabId);

                // console.log(sTabId);
                // console.log("setIOTableColumns");
                // console.log(oTable);

                oTable.getModel().setProperty("/columns", oColumns);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnDataType = context.getObject().DataType;

                    // if(sTabId === "iodetMatTab"){
                    //     console.log(sColumnId);
                    //     console.log(sColumnDataType);
                    // }

                    if (sColumnWidth === 0) sColumnWidth = 100;
                    // console.log(sColumnDataType);

                    var oText = new sap.m.Text({
                        wrapping: false,
                        tooltip: sColumnDataType === "BOOLEAN" ? "" : "{" + sColumnId + "}"
                    })

                    var oColProp = me._aColumns[sTabId.replace("Tab", "")].filter(fItem => fItem.ColumnName === sColumnId);
                    
                    if (oColProp && oColProp.length > 0 && oColProp[0].ValueHelp && oColProp[0].ValueHelp["items"].text && oColProp[0].ValueHelp["items"].value !== oColProp[0].ValueHelp["items"].text &&
                        oColProp[0].TextFormatMode && oColProp[0].TextFormatMode !== "Key") {
                        oText.bindText({  
                            parts: [  
                                { path: sColumnId }
                            ],  
                            formatter: function(sKey) {
                                var oValue = me.getView().getModel(oColProp[0].ValueHelp["items"].path).getData().filter(v => v[oColProp[0].ValueHelp["items"].value] === sKey);
                                
                                if (oValue && oValue.length > 0) {
                                    if (oColProp[0].TextFormatMode === "Value") {
                                        return oValue[0][oColProp[0].ValueHelp["items"].text];
                                    }
                                    else if (oColProp[0].TextFormatMode === "ValueKey") {
                                        return oValue[0][oColProp[0].ValueHelp["items"].text] + " (" + sKey + ")";
                                    }
                                    else if (oColProp[0].TextFormatMode === "KeyValue") {
                                        return sKey + " (" + oValue[0][oColProp[0].ValueHelp["items"].text] + ")";
                                    }
                                }
                                else return sKey;
                            }
                        });                        
                    }
                    else {
                        oText.bindText({  
                            parts: [  
                                { path: sColumnId }
                            ]
                        }); 
                    }

                    if (sColumnDataType === "STRING") {
                        return new sap.ui.table.Column({
                            id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),  //sColumnLabel,
                            // template: new sap.m.Text({
                            //     text: "{" + sColumnId + "}",
                            //     wrapping: false
                            //     // , 
                            //     // tooltip: "{" + sColumnId + "}"
                            // }),
                            template: me.columnTemplate(sColumnId, sColumnDataType, sTabId),
                            width: sColumnWidth + "px",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            // wrapping: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                        });
                    } else if (sColumnDataType === "BOOLEAN") {
                        // console.log(sColumnDataType + " : " + sColumnId);
                        return new sap.ui.table.Column({
                            id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),  //sColumnLabel,
                            template: new sap.m.CheckBox({
                                selected: "{" + sColumnId + "}",
                                editable: false
                            }),
                            width: sColumnWidth + "px",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            hAlign: "Center",
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                        });
                    } else {
                        // console.log(sColumnDataType + " : " + sColumnId);
                        return new sap.ui.table.Column({
                            id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),  //sColumnLabel,
                            template: new sap.m.Text({
                                text: "{" + sColumnId + "}",
                                wrapping: true
                                // , 
                                // tooltip: "{" + sColumnId + "}"
                            }),
                            width: sColumnWidth + "px",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                        });
                    }

                    // return new sap.ui.table.Column({
                    //     id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                    //     label: sColumnLabel,
                    //     template: new sap.m.Text({
                    //         text: "{" + sColumnId + "}",
                    //         wrapping: false
                    //         // , 
                    //         // tooltip: "{" + sColumnId + "}"
                    //     }),
                    //     width: sColumnWidth + "px",
                    //     sortProperty: sColumnId,
                    //     filterProperty: sColumnId,
                    //     autoResizable: true,
                    //     visible: sColumnVisible,
                    //     sorted: sColumnSorted,
                    //     hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                    //     sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    // });

                });
                // var aItems = oTable.getItems();
                // aItems[0].setSelected(true);
            },

            getIODETTableData: async function (columnData, pivot) {
                // columnData, pivot
                //Get BOM by UV actual data
                var me = this;
                var oTable = this.getView().byId("IODETTab");
                var sTabId = "IODETTab";
                var oModel = this.getOwnerComponent().getModel();
                var rowData;
                var oJSONModel = new sap.ui.model.json.JSONModel();

                // oTable.setModel();

                // var columnData = me.getView().getModel("columnData"); 
                // console.log(columnData);
                // var pivot = me.getView().getModel("pivotArray"); 
                // console.log(pivot);

                // return;
                var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");
                var cDlvSeq = this.getView().getModel("ui2").getProperty("/currDlvSeq");

                // console.log(cIONo);
                // console.log(cDlvSeq);

                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {


                        oModel.read("/IODETSet", {
                            urlParameters: {
                                // "$filter": "IONO eq '" + me._ioNo + "'"
                                "$filter": "IONO eq '" + cIONo + "' and DLVSEQ eq '" + cDlvSeq + "'"
                            },
                            success: function (oData, oResponse) {
                                oData.results.forEach(item => {
                                    item.REVDLVDT = item.REVDLVDT === "0000-00-00" || item.REVDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.REVDLVDT));
                                    item.CREATEDDT = item.CREATEDDT === "0000-00-00" || item.CREATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.CREATEDDT));
                                    item.UPDATEDDT = item.UPDATEDDT === "0000-00-00" || item.UPDATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.UPDATEDDT));
                                })
                                oData.results.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");
                                oData.results.sort((a, b,) => (a.DLVITEM > b.DLVITEM ? -1 : 1));

                                oJSONModel.setData(oData);
                                me.getView().setModel(oJSONModel, "IODETrowData");
                                me._tableRendered = sTabId;
                                // console.log(me.getView().setModel(oJSONModel, "IODETrowData"));
                                // rowData = oData.results;
                                // console.log("IODETTab Data");
                                // console.log(oData.results);
                                resolve();
                            },
                            error: function (err) {
                                // Common.closeLoadingDialog(me);
                                resolve();
                            }
                        });
                    }, 100);

                })

                await _promiseResult;

                // console.log("rowData");
                // console.log(rowData)

                // console.log("pivot");
                // console.log(pivot)

                //Get unique items of BOM by UV
                // var unique = rowData.filter((rowData, index, self) =>
                //     index === self.findIndex((t) => (t.GMC === rowData.GMC && t.PARTCD === rowData.PARTCD && t.MATTYPCLS === rowData.MATTYPCLS)));

                rowData = me.getView().getModel("IODETrowData").getProperty("/results");

                // console.log("rowData");
                // console.log(rowData);

                var unique = rowData.filter((rowData, index, self) =>
                    index === self.findIndex((t) => (t.CUSTCOLOR === rowData.CUSTCOLOR && t.IONO === rowData.IONO && t.DLVSEQ === rowData.DLVSEQ)));
                // console.log("unique");
                // console.log(unique);

                // index === self.findIndex((t) => (t.DLVITEM === rowData.DLVITEM && t.CUSTSIZE === rowData.CUSTSIZE)));

                //For every unique item
                for (var i = 0; i < unique.length; i++) {

                    //Set the pivot column for each unique item
                    for (var j = 0; j < rowData.length; j++) {
                        if (rowData[j].DESC1 !== "") {
                            // if (unique[i].DLVITEM === rowData[j].DLVITEM && unique[i].CUSTSIZE === rowData[j].CUSTSIZE) {
                            if (unique[i].CUSTCOLOR === rowData[j].CUSTCOLOR && unique[i].IONO === rowData[j].IONO && unique[i].DLVSEQ === rowData[j].DLVSEQ) {
                                for (var k = 0; k < pivot.length; k++) {
                                    var colname = pivot[k].ATTRIBCD;
                                    // console.log("colname");
                                    // console.log(colname + " " + rowData[j].CUSTSIZE);
                                    // console.log("Cust Size");
                                    // console.log(rowData[j].CUSTSIZE);
                                    if (rowData[j].CUSTSIZE === colname) {
                                        // console.log(unique[i]);
                                        // console.log(i + " " + colname + " " + unique[i][colname] + " " + rowData[j].CUSTSIZE);
                                        unique[i][colname + "REVORDERQTY"] = rowData[j].REVORDERQTY;
                                        unique[i][colname + "SHIPQTY"] = rowData[j].SHIPQTY;
                                        unique[i]["IOITEM" + colname + "REVORDERQTY"] = rowData[j].IOITEM;
                                        unique[i]["IOITEM" + colname + "SHIPQTY"] = rowData[j].IOITEM;
                                    }
                                }
                            }
                        }
                    }
                }

                //set the table columns/rows
                // rowData = oData.results;
                unique.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");

                var oJSONModel = new JSONModel();
                oJSONModel.setData({
                    results: unique,
                    columns: columnData
                });

                // console.log("Columns Data");
                // console.log(columnData);

                // console.log("unique");
                // console.log(unique);

                // console.log("oJSONModel");
                // console.log(oJSONModel);

                oTable.setModel(oJSONModel, "DataModel");
                // console.log("Data Model Pivot");
                // console.log(oTable.setModel(oJSONModel, "DataModel"));
                // oTable.attachPaste();

                // console.log(oTable);
                // oTable.getModel().setProperty("/columns", columnData);

                // oTable.bindColumns("DataModel>/columns", function (sId, oContext) {
                oTable.bindColumns("DataModel>/columns", function (sId, oContext) {
                    // console.log(oContext.getObject());
                    var column = oContext.getObject();
                    var sColumnId = column.ColumnName;
                    var sColumnLabel = column.ColumnLabel;
                    var sColumnWidth = column.ColumnWidth;
                    var sColumnVisible = column.Visible;
                    var sColumnSorted = column.Sorted;
                    var sColumnSortOrder = column.SortOrder;
                    var sColumnDataType = column.DataType;

                    if (sColumnWidth === 0 || sColumnWidth === undefined) sColumnWidth = 100;

                    // console.log(sColumnId);
                    return new sap.ui.table.Column({
                        id: sTabId.replace("Tab", "") + sColumnId,
                        // id: sColumnId, "Col" 
                        label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),  //sColumnLabel,
                        template: me.styleColumnTemplate('', column),
                        width: sColumnWidth + "px",
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });

                    // if (sColumnDataType === "STRING") {
                    //     return new sap.ui.table.Column({
                    //         id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                    //         label: sColumnLabel,
                    //         template: me.styleColumnTemplate('', column),
                    //         width: sColumnWidth + "px",
                    //         sortProperty: sColumnId,
                    //         filterProperty: sColumnId,
                    //         autoResizable: true,
                    //         visible: sColumnVisible,
                    //         sorted: sColumnSorted,
                    //         hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                    //         sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    //     });
                    // } else if (sColumnDataType === "BOOLEAN") {
                    //     return new sap.ui.table.Column({
                    //         id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                    //         label: sColumnLabel,
                    //         template: new sap.m.CheckBox({ selected: true, editable: false }),
                    //         width: sColumnWidth + "px",
                    //         sortProperty: sColumnId,
                    //         filterProperty: sColumnId,
                    //         autoResizable: true,
                    //         visible: sColumnVisible,
                    //         sorted: sColumnSorted,
                    //         hAlign: "Center",
                    //         sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    //     });
                    // } else {
                    //     return new sap.ui.table.Column({
                    //         id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                    //         label: sColumnLabel,
                    //         template: new sap.m.Text({
                    //             text: "{" + sColumnId + "}",
                    //             wrapping: false
                    //             // , 
                    //             // tooltip: "{" + sColumnId + "}"
                    //         }),
                    //         width: sColumnWidth + "px",
                    //         sortProperty: sColumnId,
                    //         filterProperty: sColumnId,
                    //         autoResizable: true,
                    //         visible: sColumnVisible,
                    //         sorted: sColumnSorted,
                    //         hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                    //         sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    //     });
                    // }
                });

                oTable.bindRows("DataModel>/results");
                // console.log("DataModel>/results");

                // oTable.bindRows("/results");
                // console.log("/results");
                // console.log(oTable);

                // Common.closeLoadingDialog(me);

                _promiseResult = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this.getIODETMATLSTData(cIONo, cDlvSeq);
                    }, 100);
                    resolve();
                });
                await _promiseResult;

            },

            IOColumnTemplate: function (type, column) {
                //set the column template based on gynamic fields
                var columnName = column.ColumnName;
                var oColumnTemplate;

                // oColumnTemplate = new sap.m.Text({ text: "{DataModel>" + columnName + "}", wrapping: false, tooltip: "{DataModel>" + columnName + "}" });
                // return oColumnTemplate;

                if (column.DataType === "STRING") {
                    oColumnTemplate = new sap.m.Text({ text: "{DataModel>" + columnName + "}", wrapping: true, tooltip: "{DataModel>" + columnName + "}" });
                } else if (sColumnDataType === "BOOLEAN") {
                    // console.log(sColumnDataType + " : " + sColumnId);
                    oColumnTemplate = new new sap.m.CheckBox({ selected: true, editable: false });
                }
                return oColumnTemplate;
            },

            // getIODetDynamicTableColumns: function () {
            //     var me = this;

            //     var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
            //     this.oJSONModel = new sap.ui.model.json.JSONModel();

            //     this._Model2.setHeaders({
            //         sbu: this._sbu,
            //         type: 'IODET',
            //         tabname: 'ZERP_IODET'
            //     });

            //     this._Model2.read("/ColumnsSet", {
            //         success: function (oData, oResponse) {
            //             oJSONColumnsModel.setData(oData);
            //             me.oJSONModel.setData(oData);
            //             me.getView().setModel(oJSONColumnsModel, "IODetDynColumns");  //set the view model
            //             // console.log(me.getView().setModel(oJSONColumnsModel, "IODetDynColumns"));  //set the view model
            //             me.getIODetDynamicTableData(oData.results);
            //         },
            //         error: function (err) { }
            //     })
            //         ;
            // },

            // getIODetDynamicTableData: function (columns) {
            //     var me = this;
            //     var vSBU = this.getView().getModel("ui2").getProperty("/sbu");
            //     var oModel = this.getOwnerComponent().getModel();
            //     var oJSONDataModel = new sap.ui.model.json.JSONModel();

            //     // var ioNo = this._ioNo;

            //     // var oText = this.getView().byId("IODetCount");

            //     var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");
            //     var cDlvSeq = this.getView().getModel("ui2").getProperty("/currDlvSeq");

            //     oModel.read("/IODETSet", {
            //         urlParameters: {
            //             "$filter": "IONO eq '" + cIONo + "' and DLVSEQ eq '" + cDlvSeq + "'"
            //         },
            //         success: function (oData, oResponse) {
            //             // oText.setText(oData.Results.length + "");

            //             oJSONDataModel.setData(oData);
            //             me.getView().setModel(oJSONDataModel, "IODetDataModel");
            //             me.setIODetTableData();

            //             me.setChangeStatus(false);
            //         },
            //         error: function (err) { }
            //     });
            // },

            // setIODetTableData: function () {
            //     var me = this;

            //     //the selected dynamic columns
            //     var oDetColumnsModel = this.getView().getModel("IODetDynColumns");
            //     var oDetDataModel = this.getView().getModel("IODetDataModel");

            //     //the selected styles data
            //     var oDetColumnsData = oDetColumnsModel.getProperty('/results');
            //     var oDetData = oDetDataModel.getProperty('/results');

            //     //set the column and data model
            //     var oModel = new JSONModel();
            //     oModel.setData({
            //         columns: oDetColumnsData,
            //         rows: oDetData
            //     });

            //     var oDetTableIODet = this.getView().byId("IODETTab");
            //     oDetTableIODet.setModel(oModel);

            //     //bind the dynamic column to the table
            //     oDetTableIODet.bindColumns("/columns", function (index, context) {
            //         var sColumnId = context.getObject().ColumnName;
            //         var sColumnLabel = context.getObject().ColumnLabel;
            //         var sColumnType = context.getObject().ColumnType;
            //         var sColumnWidth = context.getObject().ColumnWidth;
            //         var sColumnVisible = context.getObject().Visible;
            //         var sColumnSorted = context.getObject().Sorted;
            //         var sColumnSortOrder = context.getObject().SortOrder;
            //         return new sap.ui.table.Column({
            //             // id: sColumnId,
            //             label: sColumnLabel, //"{i18n>" + sColumnId + "}",
            //             template: me.columnTemplate(sColumnId, sColumnType, "IODet"),
            //             width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
            //             sortProperty: sColumnId,
            //             filterProperty: sColumnId,
            //             autoResizable: true,
            //             visible: sColumnVisible,
            //             sorted: sColumnSorted,
            //             sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
            //         });
            //     });

            //     //bind the data to the table
            //     oDetTableIODet.bindRows("/rows");
            // },

            getDlvSchedDynamicTableColumns: function () {
                var me = this;

                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();

                this._Model4.setHeaders({
                    sbu: this._sbu,
                    type: 'IODLV',
                    tabname: 'ZDV_3DERP_IODLV'
                });

                this._Model4.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);
                        me.oJSONModel.setData(oData);
                        me.getView().setModel(oJSONColumnsModel, "DlvSchedDynColumns");  //set the view model
                        // console.log("Delivery Schedule Dynamic Columns");
                        // console.log(me.getView().setModel(oJSONColumnsModel, "DlvSchedDynColumns"));  //set the view model
                        me.getDlvSchedDynamicTableData(oData.results);
                    },
                    error: function (err) { }
                })
                    ;
            },

            getDlvSchedDynamicTableData: function (columns) {
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONDataModel = new sap.ui.model.json.JSONModel();

                var ioNo = this._ioNo;

                // var oText = this.getView().byId("DlvSchedCount");

                oModel.read("/IODLVSet", {
                    urlParameters: {
                        "$filter": "IONO eq '" + ioNo + "'"
                    },
                    success: function (oData, oResponse) {
                        oData.results.forEach(item => {
                            item.CPODT = item.CPODT === "0000-00-00" || item.CPODT === "    -  -  " ? "" : dateFormat.format(new Date(item.CPODT));
                            item.DLVDT = item.DLVDT === "0000-00-00" || item.DLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.DLVDT));
                            item.REVDLVDT = item.REVDLVDT === "0000-00-00" || item.REVDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.REVDLVDT));
                            item.CREATEDDT = item.CREATEDDT === "0000-00-00" || item.CREATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.CREATEDDT));
                            item.UPDATEDDT = item.UPDATEDDT === "0000-00-00" || item.UPDATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.UPDATEDDT));
                            item.DELETED = item.DELETED === "X" ? true : false;
                            // item.CPODT = dateFormat.format(new Date(item.CPODT));
                            // item.DLVDT = dateFormat.format(new Date(item.DLVDT));
                            // item.REVDLVDT = dateFormat.format(new Date(item.REVDLVDT));
                            // item.CREATEDDT = dateFormat.format(new Date(item.CREATEDDT));
                            // item.UPDATEDDT = dateFormat.format(new Date(item.UPDATEDDT));
                        })
                        oJSONDataModel.setData(oData);
                        me.getView().setModel(oJSONDataModel, "DlvSchedDataModel");
                        // console.log("Delivery Schedule Data");
                        // console.log(me.getView().setModel(oJSONDataModel, "DlvSchedDataModel"));
                        me.setDlvSchedTableData();
                        me.setChangeStatus(false);
                    },
                    error: function (err) { }
                });
            },

            setDlvSchedTableData: function () {
                var me = this;

                //the selected dynamic columns
                var oDetColumnsModel = this.getView().getModel("DlvSchedDynColumns");
                var oDetDataModel = this.getView().getModel("DlvSchedDataModel");

                //the selected styles data
                var oDetColumnsData = oDetColumnsModel.getProperty('/results');
                var oDetData = oDetDataModel.getProperty('/results');

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({
                    columns: oDetColumnsData,
                    rows: oDetData
                });

                var oDetTableDlvSched = this.getView().byId("IODlvTab");
                oDetTableDlvSched.setModel(oModel);

                //bind the dynamic column to the table
                oDetTableDlvSched.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    return new sap.ui.table.Column({
                        // id: sColumnId,
                        label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),  //sColumnLabel, //"{i18n>" + sColumnId + "}",
                        template: me.columnTemplate(sColumnId, sColumnType, "DlvSched"),
                        width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });

                //bind the data to the table
                oDetTableDlvSched.bindRows("/rows");
            },

            getStatDynamicTableColumns: function () {
                var me = this;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();

                // this._SBU = this.getView().byId("SmartFilterBar").getFilterData().SBU;  //get selected SBU
                // this._sbu = 'VER'
                this._Model3.setHeaders({
                    sbu: this._sbu,
                    type: 'IOSTAT',
                    tabname: 'ZERP_IOSTATUS'
                    // userid: this._userid
                    // userid: 'BAS_CONN'
                });

                this._Model3.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);
                        me.oJSONModel.setData(oData);
                        me.getView().setModel(oJSONColumnsModel, "StatDynColumns");  //set the view model
                        // console.log(me.getView().setModel(oJSONColumnsModel, "DynColumns"));  //set the view model
                        setTimeout(() => {
                            me.getStatDynamicTableData(oData.results);
                        }, 100);
                    },
                    error: function (err) { }
                })
                    ;
            },

            getStatDynamicTableData: function (columns) {
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONDataModel = new sap.ui.model.json.JSONModel();

                var ioNo = this._ioNo;

                var oText = this.getView().byId("StatCount");

                oModel.read("/IOSTATSet", {
                    urlParameters: {
                        "$filter": "IONO eq '" + ioNo + "'"
                    },
                    success: function (oData, oResponse) {
                        // oText.setText(oData.Results.length + "");

                        oData.results.forEach(item => {
                            item.UPDATEDDT = item.UPDATEDDT === "0000-00-00" || item.UPDATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.UPDATEDDT));
                            item.UPDATETM = timeFormat.format(new Date(item.UPDATEDTM.ms + TZOffsetMs));
                        })

                        oJSONDataModel.setData(oData);
                        me.getView().setModel(oJSONDataModel, "StatDataModel");
                        // console.log(me.getView().setModel(oJSONDataModel, "DataModel"));
                        setTimeout(() => {
                            me.setStatTableData();
                        }, 100);
                        me.setChangeStatus(false);
                    },
                    error: function (err) { }
                });
            },

            setStatTableData: function () {
                var me = this;

                //the selected dynamic columns
                var oDetColumnsModel = this.getView().getModel("StatDynColumns");
                var oDetDataModel = this.getView().getModel("StatDataModel");

                //the selected styles data
                var oDetColumnsData = oDetColumnsModel.getProperty('/results');
                var oDetData = oDetDataModel.getProperty('/results');

                // //add column for copy button
                // oColumnsData.unshift({
                //     "ColumnName": "Copy",
                //     "ColumnType": "COPY",
                //     "Visible": false
                // });

                //add column for manage button
                oDetColumnsData.unshift({
                    "ColumnName": "ManageStat",
                    "ColumnType": "SEL"
                });

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({
                    columns: oDetColumnsData,
                    rows: oDetData
                });

                var oDetTable2 = this.getView().byId("StatDynTable");
                oDetTable2.setModel(oModel);

                //bind the dynamic column to the table
                oDetTable2.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    // console.log(sColumnId);
                    return new sap.ui.table.Column({
                        // id: sColumnId,
                        label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),  //sColumnLabel, //"{i18n>" + sColumnId + "}",
                        template: me.columnTemplate(sColumnId, sColumnType, "Stat"),
                        width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });

                //bind the data to the table
                oDetTable2.bindRows("/rows");
            },

            getAttribDynamicTableColumns: function () {
                var me = this;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new sap.ui.model.json.JSONModel();
                this.oJSONModel = new sap.ui.model.json.JSONModel();

                // this._SBU = this.getView().byId("SmartFilterBar").getFilterData().SBU;  //get selected SBU
                // this._sbu = 'VER'
                this._Model2.setHeaders({
                    sbu: this._sbu,
                    type: 'IOATTRIB',
                    tabname: 'ZERP_IOATTRIB'
                    // userid: this._userid
                    // userid: 'BAS_CONN'
                });

                this._Model2.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);
                        me.oJSONModel.setData(oData);
                        me.getView().setModel(oJSONColumnsModel, "AttribDynColumns");  //set the view model
                        setTimeout(() => {
                            me.getAttribDynamicTableData(oData.results);
                        }, 100);
                    },
                    error: function (err) { }
                })
                    ;
            },

            getAttribDynamicTableData: function (columns) {
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONDataModel = new sap.ui.model.json.JSONModel();

                var ioNo = this._ioNo;

                var oText = this.getView().byId("AttribCount");

                oModel.read("/IOATTRIBSet", {
                    urlParameters: {
                        "$filter": "IONO eq '" + ioNo + "'"
                    },
                    success: function (oData, oResponse) {
                        // oText.setText(oData.Results.length + "");

                        // oData.results.forEach(item => {
                        //     item.CREATEDDT = dateFormat.format(item.CREATEDDT);    
                        //     item.UPDATEDDT = dateFormat.format(item.UPDATEDDT);                            
                        // })

                        oJSONDataModel.setData(oData);
                        me.getView().setModel(oJSONDataModel, "AttribDataModel");
                        // console.log("attrib data");
                        // console.log(me.getView().setModel(oJSONDataModel, "AttribDataModel"));
                        setTimeout(() => {
                            me.setAttribTableData();
                        }, 100);

                        me.setChangeStatus(false);
                    },
                    error: function (err) { }
                });
            },

            setAttribTableData: function () {
                var me = this;

                //the selected dynamic columns
                var oDetColumnsModel = this.getView().getModel("AttribDynColumns");
                var oDetDataModel = this.getView().getModel("AttribDataModel");

                //the selected styles data
                var oDetColumnsData = oDetColumnsModel.getProperty('/results');
                var oDetData = oDetDataModel.getProperty('/results');

                // //add column for copy button
                // oColumnsData.unshift({
                //     "ColumnName": "Copy",
                //     "ColumnType": "COPY",
                //     "Visible": false
                // });

                //add column for manage button
                oDetColumnsData.unshift({
                    "ColumnName": "ManageAttrib",
                    "ColumnType": "SEL"
                });

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({
                    columns: oDetColumnsData,
                    rows: oDetData
                });

                var oDetTable = this.getView().byId("AttribDynTable");
                oDetTable.setModel(oModel);

                //bind the dynamic column to the table
                oDetTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = context.getObject().ColumnLabel;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    return new sap.ui.table.Column({
                        // id: sColumnId,
                        label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),  //sColumnLabel, //"{i18n>" + sColumnId + "}",
                        template: me.columnTemplate(sColumnId, sColumnType, "Attrib"),
                        width: me.getFormatColumnSize(sColumnId, sColumnType, sColumnWidth) + 'px',
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });

                //bind the data to the table
                oDetTable.bindRows("/rows");
            },

            columnTemplate: function (sColumnId, sColumnType, sSource) {
                var oDetColumnTemplate;

                //different component based on field
                // if (sColumnId === "STATUSCD") { //display infolabel for Status Code
                //     oDetColumnTemplate = new sap.tnt.InfoLabel({
                //         text: "{" + sColumnId + "}",
                //         colorScheme: "{= ${" + sColumnId + "} === 'CMP' ? 8 : ${" + sColumnId + "} === 'CRT' ? 3 : 1}"
                //     })
                // } else 
                if (sColumnType === "SEL") { //Manage button
                    var tToolTip;
                    var sKey;
                    if (sSource === "Attrib") {
                        tToolTip = "Manage this Attribute"
                        sKey = "VERNO"
                    } else if (sSource === "Stat") {
                        tToolTip = "Manage this Status"
                        sKey = "STATUSCD"
                    } else if (sSource === "DlvSched") {
                        tToolTip = "Manage this Delivery Schedule"
                        sKey = "DLVSEQ"
                    } else if (sSource === "IODet") {
                        tToolTip = "Manage this IO Item"
                        sKey = "IOITEM"
                    }
                    oDetColumnTemplate = new sap.m.Button({
                        text: "",
                        icon: "sap-icon://detail-view",
                        type: "Ghost"
                        // ,press: this.goToDetail 
                        , tooltip: tToolTip
                    });
                    oDetColumnTemplate.data(sKey, "{}"); //custom data to hold key id
                }

                if (sColumnId === "STATUSCD") {
                    oDetColumnTemplate = new sap.tnt.InfoLabel({
                        text: "{" + sColumnId + "}",
                        colorScheme: "{= ${" + sColumnId + "} === 'CLS' ? 5 : ${" + sColumnId + "} === 'CNL' ? 3: ${" + sColumnId + "} === 'CRT' ? 8: ${" + sColumnId + "} === 'MAT' ? 1 : ${" + sColumnId + "} === 'REL' ? 7 : 1}"
                    })
                }
                else {
                    oDetColumnTemplate = new sap.m.Text({
                        text: "{" + sColumnId + "}"
                        , wrapping: true
                        // , tooltip: "{" + sColumnId + "}"
                    }); //default text
                }

                // oDetColumnTemplate = new sap.m.Text({
                //     text: "{" + sColumnId + "}"
                //     , wrapping: false
                //     // ,tooltip: "{" + sColumnId + "}"
                // }); //default text
                return oDetColumnTemplate;
            },

            getColumnSize: function (sColumnId, sColumnType) {
                //column width of fields
                var mSize = '7';
                if (sColumnType === "SEL") {
                    mSize = '3.5rem';
                } else if (sColumnType === "COPY") {
                    mSize = '3.5rem';
                } else if (sColumnId === "STYLECD") {
                    mSize = '25rem';
                } else if (sColumnId === "DESC1" || sColumnId === "PRODTYP") {
                    mSize = '15rem';
                } else if (sColumnId === "DLVDT" || sColumnId === "DOCDT" || sColumnId === "CREATEDDT" || sColumnId === "UPDATEDDT") {
                    mSize = '30rem';
                }
                return mSize;
            },

            getFormatColumnSize: function (sColumnId, sColumnType, sColumnSize) {
                //column width of fields
                var mSize = sColumnSize;
                if (sColumnType === "SEL") {
                    mSize = '30';
                } else if (sColumnType === "COPY") {
                    mSize = '30';
                }
                // else if (sColumnId === "STYLECD") {
                //     mSize = '25';
                // } else if (sColumnId === "DESC1" || sColumnId === "PRODTYP") {
                //     mSize = '15';
                // } else if (sColumnId === "DLVDT" || sColumnId === "DOCDT" || sColumnId === "CREATEDDT" || sColumnId === "UPDATEDDT") {
                //     mSize = '30';
                // }
                return mSize;
            },

            getHeaderConfig: async function () {
                // console.log("getHeaderConfig");
                var me = this;
                var oView = this.getView();
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var oJSONModel = new sap.ui.model.json.JSONModel();
                var oJSONModelEdit = new sap.ui.model.json.JSONModel();

                //get header fields
                oModel.setHeaders({
                    sbu: this._sbu,
                    type: 'IOHDR',
                    tabname: 'ZERP_IOHDR'
                });

                await new Promise((resolve, reject) => {
                    oModel.read("/ColumnsSet", {
                        success: function (oData, oResponse) {

                            // console.log("IO Header Tab");
                            // console.log(oData);
                            me._aColumns["IOHDRTab"] = oData.results;
                            // console.log("_aColumns IOHDRTab");
                            // console.log(me._aColumns["IOHDRTab"]);

                            var visibleFields = new JSONModel();
                            var visibleFields = {};

                            var editableFields = new JSONModel();
                            var editableFields = {};

                            for (var i = 0; i < oData.results.length; i++) {
                                //get only visible fields
                                visibleFields[oData.results[i].ColumnName] = oData.results[i].Visible;
                                //get only editable fields
                                editableFields[oData.results[i].ColumnName] = oData.results[i].Editable;
                            }



                            var JSONdata = JSON.stringify(visibleFields);
                            var JSONparse = JSON.parse(JSONdata);
                            oJSONModel.setData(JSONparse);
                            oView.setModel(oJSONModel, "VisibleFieldsData");
                            // console.log(oView.setModel(oJSONModel, "VisibleFieldsData"));

                            var JSONdataEdit = JSON.stringify(editableFields);
                            var JSONparseEdit = JSON.parse(JSONdataEdit);
                            oJSONModelEdit.setData(JSONparseEdit);
                            oView.setModel(oJSONModelEdit, "EditableFieldsData");

                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });
                });
            },

            onHeaderChange: async function (oEvent) {
                console.log("onHeaderChange");
                var me = this;
                if (oEvent === undefined)
                    return;

                var oSource = oEvent.getSource();
                var srcInput = oSource.getBindingInfo("value").parts[0].path;
                console.log(srcInput);
                // alert(oSource.getBindingInfo("value").parts[0].path);
                if (srcInput === "/PRODSCEN") {
                    var sProdScen = this.getView().byId("PRODSCEN").getValue();

                    var oData = this.getView().getModel("ProdScenModel").oData;
                    for (var i = 0; i < oData.results.length; i++) {
                        if (oData.results[i].PRODSCEN === sProdScen) {
                            // alert(oData.results[i].PRODPLANT);
                            this.getView().byId("PRODPLANT").setValue(oData.results[i].PRODPLANT);
                            this.getView().byId("TRADPLANT").setValue(oData.results[i].TRADPLANT);
                            this.getView().byId("PLANPLANT").setValue(oData.results[i].PLANPLANT);
                            this.getView().byId("FTYSALTERM").setValue(oData.results[i].FTY_SALES_TERM);
                            this.getView().byId("CUSSALTERM").setValue(oData.results[i].CUST_SALES_TERM);
                            this.getView().byId("SALESORG").setValue(oData.results[i].SALESORG);
                            this.getView().getModel("ui2").setProperty("/WeaveTyp", oData.results[i].WVTYP);

                        }
                    }
                }

                if (srcInput === "/CUSTDLVDT") {
                    console.log("On Header Change Customer Delivery date");
                    let cntBlank = 0;
                    let inputField = this.getView().byId("PRODSCEN");
                    if (this.isInputFieldBlank(inputField)) {
                        console.log("PRODSCEN");
                        cntBlank++;
                    }

                    inputField = this.getView().byId("PRODPLANT");
                    if (this.isInputFieldBlank(inputField)) {
                        console.log("PRODPLANT");
                        cntBlank++;
                    }

                    inputField = this.getView().byId("IOTYPE");
                    if (this.isInputFieldBlank(inputField)) {
                        console.log("IOTYPE");
                        cntBlank++;
                    }

                    let inputValue = this.getView().byId("CUSTDLVDT").getValue();
                    console.log(inputValue);
                    if (!Date.parse(inputValue)) {
                        console.log("CUSTDLVDT");
                        cntBlank++;
                    }

                    console.log("cntBlank");
                    console.log(cntBlank);

                    //cntBlank value is zero, no errors / has values(at least valid)
                    if (cntBlank === 0) {
                        console.log("true");
                        let txtWeaveTyp;
                        let txtProdPlant;
                        let txtProdScen = this.getView().byId("PRODSCEN").getValue();
                        let oData = this.getView().getModel("ProdScenModel").oData;
                        for (var i = 0; i < oData.results.length; i++) {
                            if (oData.results[i].PRODSCEN === txtProdScen) {
                                txtWeaveTyp = oData.results[i].WVTYP;
                                txtProdPlant = oData.results[i].PRODPLANT;
                            }
                        }

                        let txtIOType = this.getView().byId("IOTYPE").getValue();
                        if (txtProdPlant !== this.getView().byId("PRODPLANT").getValue()) {
                            txtProdPlant = this.getView().byId("PRODPLANT").getValue();
                        }

                        let oModel = this.getOwnerComponent().getModel();

                        let fldCustDlvDt = this.getView().byId("CUSTDLVDT");
                        let CustDlvDtValue = new Date(fldCustDlvDt.getDateValue());

                        console.log(txtWeaveTyp);

                        await new Promise((resolve, reject) => {
                            oModel.read("/PRDLEADTMSet", {
                                urlParameters: {
                                    "$filter": "SBU eq '" + this._sbu + "' and IOTYPE eq '" + txtIOType + "' and EVENTCD eq 'ALL' and PLANTCD eq '" + txtProdPlant + "' and WEAVETYP eq '" + txtWeaveTyp + "'"
                                },
                                success: function (oData, response) {
                                    // me.getView().setModel(new JSONModel(oData), "PRDLEADTMModel");
                                    console.log("PRDLEADTMModel");
                                    console.log(oData);
                                    var dtProdStart = me.getView().byId("PRODSTART");
                                    oData.results.forEach(item => {
                                        CustDlvDtValue.setDate(CustDlvDtValue.getDate() - item.LEADTM);
                                        me.getView().byId("PRODSTART").setValue(sapDateFormat.format(new Date(CustDlvDtValue)));
                                        me.getView().byId("PRODDAYS").setValue(item.LEADTM);
                                        me.getView().getModel("ui2").setProperty("/ProdDays", item.LEADTM);
                                        // dtProdStart.setDateValue(CustDlvDtValue);
                                    })

                                    resolve();
                                },
                                error: function (err) {
                                    resolve();
                                }
                            })
                        })

                        inputField = this.getView().byId("PRODSTART");
                        // let vProdDt = new Date(inputField.getValue());
                        let vProdDt = sapDateFormat.format(new Date(inputField.getValue()));
                        let txtYear = new Date(inputField.getValue()).getFullYear();

                        console.log(vProdDt);
                        console.log(txtYear);

                        var dateFormatter = sap.ui.core.format.DateFormat.getDateTimeInstance({
                            pattern: "yyyy-MM-dd'T'HH:mm:ss"
                        });

                        vProdDt = dateFormatter.format(new Date(vProdDt)); // 2023-04-23T00:00:00
                        console.log(vProdDt);

                        await new Promise((resolve, reject) => {
                            oModel.read("/PRDCALSet", {
                                urlParameters: {
                                    "$filter": "Plantcd eq '" + txtProdPlant + "' and Prodyr eq '" + txtYear + "' and Startdt eq datetime'" + vProdDt + "'"
                                },
                                success: function (oData, response) {
                                    console.log(oData);
                                    oData.results.forEach(item => {
                                        me.getView().byId("PLANMONTH").setValue(item.Prodyr + "/" + item.Prodmo);
                                        me.getView().byId("PRODWK").setValue(+item.Prodwk);
                                        me.getView().getModel("ui2").setProperty("/ProdWk", item.Prodwk);
                                    })
                                    resolve();
                                },
                                error: function (err) {
                                    resolve();
                                }
                            })
                        })

                        await this.getIOPrefixSet("ZGW_3DERP_RFC_SRV", this._sbu, "");
                    }
                }

                if (srcInput === "/PLANDLVDT") {
                    let inputValue = this.getView().byId("PLANDLVDT").getValue();
                    console.log(inputValue);
                    if (Date.parse(inputValue)) {
                        let dtPlanDlv = new Date(inputValue);
                        let dtCustDlv = new Date(this.getView().byId("CUSTDLVDT").getValue());

                        console.log(dtPlanDlv);
                        console.log(dtCustDlv);

                        if (dtPlanDlv > dtCustDlv) {
                            // sap.m.MessageBox.error(this.getView().getModel("ddtext").getData()["PLANDLVDT_ERR_VALIDATION"]);
                            this.getView().byId("PLANDLVDT").setValueState("Error");
                            this.getView().byId("PLANDLVDT").setValueStateText(this.getView().getModel("ddtext").getData()["PLANDLVDT_ERR_VALIDATION"]);
                            this.getView().byId("PLANDLVDT").setValue("");
                        } else if (!Date.parse(dtCustDlv)) {
                            this.getView().byId("PLANDLVDT").setValueState("Error");
                            this.getView().byId("PLANDLVDT").setValueStateText(this.getView().getModel("ddtext").getData()["ERR_CUSTDLVDT_REQUIRED"]);
                            this.getView().byId("PLANDLVDT").setValue("");
                        } else {
                            this.getView().byId("PLANDLVDT").setValueState("None");
                        }
                    }
                }

                if (srcInput === "/STYLENO") {
                    var sStyleNo = this.getView().byId("STYLENO").getValue();

                    var oData = this.getView().getModel("StyleNoModel").oData;
                    // console.log(oData);     
                    for (var i = 0; i < oData.results.length; i++) {
                        if (oData.results[i].STYLENO === sStyleNo) {
                            this.getView().byId("VERNO").setValue(oData.results[i].VERNO);
                            this.getView().byId("PRODTYPE").setValue(oData.results[i].PRODTYP);
                            this.getView().byId("STYLECD").setValue(oData.results[i].STYLECD);
                            this.getView().byId("SEASONCD").setValue(oData.results[i].SEASONCD);
                            this.getView().byId("CUSTGRP").setValue(oData.results[i].CUSTGRP);
                            this.getView().byId("BASEUOM").setValue(oData.results[i].UOM);
                        }
                    }
                }

                // if(srcInput === "/PRODSCEN" || srcInput === "/SOLDTOCUST" || srcInput === "/PRODPLANT" || srcInput === "/SALESORG" || srcInput === "/PLANMONTH") {
                //     _promiseResult = new Promise((resolve, reject) => {
                //         resolve(this.getIOPrefixSet("ZGW_3DERP_RFC_SRV", this._sbu, ""));
                //     });
                //     await _promiseResult;

                //     this.getView().byId("IOPREFIX").setValue(sIOPrefix);
                //     this.getView().byId("IODESC").setValue(sIODesc);
                // }

                //set change flag for header
                this._headerChanged = true;
                this.setChangeStatus(true);
            },

            setChangeStatus: function (changed) {
                //controls the edited warning message
                try {
                    sap.ushell.Container.setDirtyFlag(changed);
                } catch (err) { }
            },

            getVHSet: function (EntitySet, ModelName, SBUFilter, bHdrFilter) {
                var oSHModel = this.getOwnerComponent().getModel();
                var oSHModel2 = this.getOwnerComponent().getModel("ZGW_3DERP_SH_SRV");
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                var sEntitySet = EntitySet;
                var sModelName = ModelName;
                var bSBUFilter = SBUFilter;

                //  /SEASONSet , SeasonsModel
                if (bSBUFilter === true && bHdrFilter === true) {
                    oSHModel2.setHeaders({
                        sbu: this._sbu
                    })

                    oSHModel2.read(sEntitySet, {
                        success: function (oData, oResponse) {

                            // console.log(sModelName);
                            // console.log(oData);
                            oJSONModel.setData(oData);
                            oView.setModel(oJSONModel, sModelName);

                            if (sModelName === "SOLDTOModel") {
                                oData.results.forEach(item => {
                                    item.Custno = item.Custno === undefined ? "" : item.Custno;
                                    item.Desc1 = item.Desc1 === undefined ? "" : item.Desc1;
                                })
                            }
                        },
                        error: function (err) {
                        }
                    });
                }

                if (bSBUFilter === true && bHdrFilter === false) {
                    // await new Promise((resolve, reject) => {
                    oSHModel.read(sEntitySet, {
                        urlParameters: {
                            "$filter": "SBU eq '" + this._sbu + "'"
                        },
                        success: function (oData, oResponse) {
                            oJSONModel.setData(oData);
                            oView.setModel(oJSONModel, sModelName);
                            // console.log(oView.setModel(oJSONModel, ModelName));
                            // resolve();
                        },
                        error: function (err) {
                            // resolve();
                        }
                    });
                    // });
                } else {

                    if (sModelName === "BILLTOModel" || sModelName === "SHIPTOModel") {
                        var soldtoCust = this.getView().byId("SOLDTOCUST").getValue(); //get customer group value
                        oSHModel.read(sEntitySet, {
                            urlParameters: {
                                "$filter": "Soldtocust eq '" + soldtoCust + "'"
                            },
                            success: function (oData, oResponse) {
                                // console.log(sModelName);
                                // console.log(oData);

                                if (sModelName === "BILLTOModel") {
                                    oData.results.forEach(item => {
                                        item.CUSTBILLTO = item.CUSTBILLTO === undefined ? "" : item.CUSTBILLTO;
                                    })
                                }

                                if (sModelName === "SHIPTOModel") {
                                    oData.results.forEach(item => {
                                        item.CUSTSHIPTO = item.CUSTSHIPTO === undefined ? "" : item.CUSTSHIPTO;
                                    })
                                }

                                oJSONModel.setData(oData);
                                oView.setModel(oJSONModel, sModelName);

                                // resolve();
                            },
                            error: function (err) {
                                // resolve();
                            }
                        });
                    } else {

                        // await new Promise((resolve, reject) => {
                        oSHModel.read(sEntitySet, {
                            urlParameters: {

                            },
                            success: function (oData, oResponse) {
                                // console.log(sModelName);
                                // console.log(oData);

                                if (sModelName === "SOLDTOModel") {
                                    oData.results.forEach(item => {
                                        item.KUNNR = item.KUNNR === undefined ? "" : item.KUNNR;
                                    })
                                }

                                oJSONModel.setData(oData);
                                oView.setModel(oJSONModel, sModelName);

                                // resolve();
                            },
                            error: function (err) {
                                // resolve();
                            }
                        });
                    }
                    // });
                }
            },

            getSALESORGSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oSHModel.read("/SALESORGvhSet", {
                    urlParameters: {

                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "SALESORGModel");
                    },
                    error: function (err) { }
                });
            },

            getUOMSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oSHModel.read("/UOMvhSet", {
                    urlParameters: {

                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "UOMModel");
                    },
                    error: function (err) { }
                });
            },

            getStyleNoSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oSHModel.read("/STYLENOvhSet", {
                    urlParameters: {

                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "StyleNoModel");
                    },
                    error: function (err) { }
                });
            },

            getSeasonsSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oSHModel.read("/SEASONSet", {
                    urlParameters: {
                        "$filter": "SBU eq '" + this._sbu + "'"
                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "SeasonsModel");
                    },
                    error: function (err) { }
                });
            },

            getProdScenSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oSHModel.read("/PRODSCENvhSet", {
                    urlParameters: {

                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "ProdScenModel");
                    },
                    error: function (err) { }
                });
            },

            getIOTypeSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oSHModel.read("/IOTYPSet", {
                    urlParameters: {

                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "IOTypeModel");
                    },
                    error: function (err) { }
                });
            },

            getProdTypeSet: function () {
                var oSHModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();
                oSHModel.read("/PRODTYPvhSet", {
                    urlParameters: {
                        "$filter": "SBU eq '" + this._sbu + "'"
                    },
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "ProdTypeModel");
                    },
                    error: function (err) { }
                });
            },

            getIOPrefixSet: async function (model, sbu, wvtyp) {
                var me = this;
                var sModel = model;
                var ssbu = sbu;
                var swvtyp = wvtyp;

                var oModel = this.getOwnerComponent().getModel(sModel);
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                var oParam = {
                    "SBU": ssbu,
                    "SOLDTOCUST": this.getView().byId("SOLDTOCUST").getValue(),
                    "PRODSCEN": this.getView().byId("PRODSCEN").getValue(),
                    "PRODPLANT": this.getView().byId("PRODPLANT").getValue(),
                    "SALESORG": this.getView().byId("SALESORG").getValue(),
                    "PLANMONTH": this.getView().byId("PLANMONTH").getValue()
                };

                console.log("IO Prefix oParam");
                console.log(oParam);

                return new Promise((resolve, reject) => {
                    oModel.create("/GetIOPrefixSet", oParam, {
                        method: "POST",
                        success: function (oData, oResponse) {
                            me.getView().getModel("ui2").setProperty("/IODesc", oData.IODESC);
                            me.getView().getModel("ui2").setProperty("/IOPrefix", oData.IOPREFIX);

                            me.getView().byId("IODESC").setValue(oData.IODESC);
                            me.getView().byId("IOPREFIX").setValue(oData.IOPREFIX);

                            oJSONModel.setData(oData);
                            oView.setModel(oJSONModel, "IOPrefixModel");
                            resolve();
                        },
                        error: function (err) {
                            resolve();
                        }
                    });

                    // console.log("IO Prefix");
                    // console.log(this.getView().getModel("ui2").getProperty("/IOPrefix"));
                    // console.log("IO Desc");
                    // console.log(this.getView().getModel("ui2").getProperty("/IODesc"));
                });
            },

            refreshHeaderData: async function () {
                var me = this;
                var ioNo = me._ioNo;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();
                // Common.openLoadingDialog(that);
                var entitySet = "/IOHDRSet('" + ioNo + "')"

                await me.UpdateIOHdrQuantity();

                await new Promise((resolve, reject) => {
                    oModel.read(entitySet, {
                        success: function (oData, oResponse) {
                            // console.log(oData);
                            oData.CUSTDLVDT = oData.CUSTDLVDT === "0000-00-00" || oData.CUSTDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.CUSTDLVDT));
                            oData.REVCUSTDLVDT = oData.REVCUSTDLVDT === "0000-00-00" || oData.REVCUSTDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.REVCUSTDLVDT));
                            oData.REQEXFTYDT = oData.REQEXFTYDT === "0000-00-00" || oData.REQEXFTYDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.REQEXFTYDT));
                            oData.PRODSTART = oData.PRODSTART === "0000-00-00" || oData.PRODSTART === "    -  -  " ? "" : dateFormat.format(new Date(oData.PRODSTART));
                            oData.MATETA = oData.MATETA === "0000-00-00" || oData.MATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.MATETA));
                            oData.MAINMATETA = oData.MAINMATETA === "0000-00-00" || oData.MAINMATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.MAINMATETA));
                            oData.SUBMATETA = oData.SUBMATETA === "0000-00-00" || oData.SUBMATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.SUBMATETA));
                            oData.CUTMATETA = oData.CUTMATETA === "0000-00-00" || oData.CUTMATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.CUTMATETA));
                            oData.PLANDLVDT = oData.PLANDLVDT === "0000-00-00" || oData.PLANDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.PLANDLVDT));
                            oData.CREATEDDT = oData.CREATEDDT === "0000-00-00" || oData.CREATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.CREATEDDT));
                            oData.UPDATEDDT = oData.UPDATEDDT === "0000-00-00" || oData.UPDATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.UPDATEDDT));

                            me._prodplant = oData.PRODPLANT;

                            oJSONModel.setData(oData);
                            oView.setModel(oJSONModel, "headerData");

                            resolve();
                        },
                        error: function () {
                            resolve();
                        }
                    })

                });
            },

            getHeaderData: async function () {
                var me = this;
                var ioNo = me._ioNo;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();
                // Common.openLoadingDialog(that);
                var entitySet = "/IOHDRSet('" + ioNo + "')"

                await new Promise((resolve, reject) => {
                    oModel.read(entitySet, {
                        success: function (oData, oResponse) {

                            oData.CUSTDLVDT = oData.CUSTDLVDT === "0000-00-00" || oData.CUSTDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.CUSTDLVDT));
                            oData.REVCUSTDLVDT = oData.REVCUSTDLVDT === "0000-00-00" || oData.REVCUSTDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.REVCUSTDLVDT));
                            oData.REQEXFTYDT = oData.REQEXFTYDT === "0000-00-00" || oData.REQEXFTYDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.REQEXFTYDT));
                            oData.PRODSTART = oData.PRODSTART === "0000-00-00" || oData.PRODSTART === "    -  -  " ? "" : dateFormat.format(new Date(oData.PRODSTART));
                            oData.MATETA = oData.MATETA === "0000-00-00" || oData.MATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.MATETA));
                            oData.MAINMATETA = oData.MAINMATETA === "0000-00-00" || oData.MAINMATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.MAINMATETA));
                            oData.SUBMATETA = oData.SUBMATETA === "0000-00-00" || oData.SUBMATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.SUBMATETA));
                            oData.CUTMATETA = oData.CUTMATETA === "0000-00-00" || oData.CUTMATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.CUTMATETA));
                            oData.PLANDLVDT = oData.PLANDLVDT === "0000-00-00" || oData.PLANDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.PLANDLVDT));
                            oData.CREATEDDT = oData.CREATEDDT === "0000-00-00" || oData.CREATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.CREATEDDT));
                            oData.UPDATEDDT = oData.UPDATEDDT === "0000-00-00" || oData.UPDATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.UPDATEDDT));

                            // oData.CUSTDLVDT = oData.CUSTDLVDT === null ? "" : dateFormat.format(new Date(oData.CUSTDLVDT));
                            // oData.REVCUSTDLVDT = oData.REVCUSTDLVDT === null ? "" : dateFormat.format(new Date(oData.REVCUSTDLVDT));
                            // oData.REQEXFTYDT = oData.REQEXFTYDT === null ? "" : dateFormat.format(new Date(oData.REQEXFTYDT));
                            // oData.PRODSTART = oData.PRODSTART === null ? "" : dateFormat.format(new Date(oData.PRODSTART));
                            // oData.MATETA = oData.MATETA === null ? "" : dateFormat.format(new Date(oData.MATETA));
                            // oData.MAINMATETA = oData.MAINMATETA === null ? "" : dateFormat.format(new Date(oData.MAINMATETA));
                            // oData.SUBMATETA = oData.SUBMATETA === null ? "" : dateFormat.format(new Date(oData.SUBMATETA));
                            // oData.CUTMATETA = oData.CUTMATETA === null ? "" : dateFormat.format(new Date(oData.CUTMATETA));
                            // oData.PLANDLVDT = oData.PLANDLVDT === null ? "" : dateFormat.format(new Date(oData.PLANDLVDT));
                            // oData.CREATEDDT = oData.CREATEDDT === null ? "" : dateFormat.format(new Date(oData.CREATEDDT));
                            // oData.UPDATEDDT = oData.UPDATEDDT === null ? "" : dateFormat.format(new Date(oData.UPDATEDDT));

                            // oData.CUSTDLVDT = dateFormat.format(new Date(oData.CUSTDLVDT));
                            // oData.REVCUSTDLVDT = dateFormat.format(new Date(oData.REVCUSTDLVDT));
                            // oData.REQEXFTYDT = dateFormat.format(new Date(oData.REQEXFTYDT));
                            // oData.PRODSTART = dateFormat.format(new Date(oData.PRODSTART));
                            // oData.MATETA = dateFormat.format(new Date(oData.MATETA));
                            // oData.MAINMATETA = dateFormat.format(new Date(oData.MAINMATETA));
                            // oData.SUBMATETA = dateFormat.format(new Date(oData.SUBMATETA));
                            // oData.CUTMATETA = dateFormat.format(new Date(oData.CUTMATETA));
                            // oData.PLANDLVDT = dateFormat.format(new Date(oData.PLANDLVDT));
                            // oData.CREATEDDT = dateFormat.format(new Date(oData.CREATEDDT));
                            // oData.UPDATEDDT = dateFormat.format(new Date(oData.UPDATEDDT));

                            me._styleVer = oData.VERNO;
                            me.getView().getModel("ui2").setProperty("/currVerNo", oData.VERNO);
                            me.getView().getModel("ui2").setProperty("/IOOrdQty", oData.ORDQTY);
                            me.getView().getModel("ui2").setProperty("/IORevOrdQty", oData.REVORDQTY);
                            me._prodplant = oData.PRODPLANT;

                            oJSONModel.setData(oData);
                            oView.setModel(oJSONModel, "headerData");
                            // Common.closeLoadingDialog(that);
                            me.setChangeStatus(false);
                            me._styleNo = oData.STYLENO;

                            if (oData.STYLENO != "" || oData.STYLENO != undefined)
                                me.getView().getModel("ui2").setProperty("/currStyleNo", oData.STYLENO);

                            // alert("Init Style");
                            me.initStyle();
                            me.initIOMatList();
                            me.initIOCosting();

                            resolve();
                        },
                        error: function () {
                            // Common.closeLoadingDialog(that);
                            resolve();
                        }
                    })
                });
            },

            reloadHeaderData: function (iono) {
                var me = this;
                var ioNo = iono;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                if (ioNo === "NEW") {
                    return;
                }

                Common.openLoadingDialog(that);

                var entitySet = "/IOHDRSet('" + ioNo + "')"
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        oData.CUSTDLVDT = oData.CUSTDLVDT === "0000-00-00" || oData.CUSTDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.CUSTDLVDT));
                        oData.REVCUSTDLVDT = oData.REVCUSTDLVDT === "0000-00-00" || oData.REVCUSTDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.REVCUSTDLVDT));
                        oData.REQEXFTYDT = oData.REQEXFTYDT === "0000-00-00" || oData.REQEXFTYDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.REQEXFTYDT));
                        oData.PRODSTART = oData.PRODSTART === "0000-00-00" || oData.PRODSTART === "    -  -  " ? "" : dateFormat.format(new Date(oData.PRODSTART));
                        oData.MATETA = oData.MATETA === "0000-00-00" || oData.MATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.MATETA));
                        oData.MAINMATETA = oData.MAINMATETA === "0000-00-00" || oData.MAINMATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.MAINMATETA));
                        oData.SUBMATETA = oData.SUBMATETA === "0000-00-00" || oData.SUBMATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.SUBMATETA));
                        oData.CUTMATETA = oData.CUTMATETA === "0000-00-00" || oData.CUTMATETA === "    -  -  " ? "" : dateFormat.format(new Date(oData.CUTMATETA));
                        oData.PLANDLVDT = oData.PLANDLVDT === "0000-00-00" || oData.PLANDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.PLANDLVDT));
                        oData.CREATEDDT = oData.CREATEDDT === "0000-00-00" || oData.CREATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.CREATEDDT));
                        oData.UPDATEDDT = oData.UPDATEDDT === "0000-00-00" || oData.UPDATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(oData.UPDATEDDT));

                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "headerData");
                        Common.closeLoadingDialog(that);
                        me.setChangeStatus(false);
                        me._styleNo = oData.STYLENO;
                        me._styleVer = oData.VERNO;
                        me._prodplant = oData.PRODPLANT;
                        me.getView().getModel("ui2").setProperty("/currVerNo", oData.VERNO);

                        if (oData.STYLENO != "" || oData.STYLENO != undefined)
                            me.getView().getModel("ui2").setProperty("/currStyleNo", oData.STYLENO);
                    },
                    error: function () {
                        Common.closeLoadingDialog(that);
                    }
                })
            },

            setHeaderEditMode: async function () {
                //unlock editable fields of style header
                var me = this;
                var oJSONModel = new JSONModel();
                var data = {};
                this._headerChanged = false;
                data.editMode = true;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "HeaderEditModeModel");

                // //get Value Help for fields of IO Header
                // await this.getVHSet("/IOTYPSet", "IOTypeModel", false);
                // await this.getVHSet("/PRODTYPvhSet", "ProdTypeModel", true);
                // await this.getVHSet("/PRODSCENvhSet", "ProdScenModel", false);
                // await this.getVHSet("/SEASONSet", "SeasonsModel", true);
                // await this.getVHSet("/STYLENOvhSet", "StyleNoModel", false);
                // await this.getVHSet("/UOMvhSet", "UOMModel", false);
                // await this.getVHSet("/SALESORGvhSet", "SalesOrgModel", false);
                // await this.getVHSet("/SALESGRPvhSet", "SalesGrpModel", false);
                // await this.getVHSet("/PRODPLANTvhSet", "PlantModel", false);
                // await this.getVHSet("/STYLECDvhSet", "StyleCdModel", false);
                // await this.getVHSet("/CUSTGRPvhSet", "CustGrpModel", false);
                // await this.getVHSet("/BILLTOvhSet", "BILLTOModel", false);
                // await this.getVHSet("/SHIPTOvhSet", "SHIPTOModel", false);
                // await this.getVHSet("/SOLDTOvhSet", "SOLDTOModel", false);

                var isRequiredText = this.getView().getModel("ddtext").getData()["PLACEHOLDER_REQ"];
                await new Promise((resolve, reject) => {
                    var feCName = "";
                    me._aColumns["IOHDRTab"].forEach(ci => {
                        if (ci.Mandatory === true && ci.Editable === true) {
                            // console.log(ci.ColumnName);
                            feCName = "fe" + ci.ColumnName;
                            this.getView().byId(feCName)._oLabel.addStyleClass("sapMLabelRequired");
                            this.byId(ci.ColumnName).setPlaceholder(ci.ColumnLabel + " " + isRequiredText);

                            // this.getView().byId(ci.ColumnName).setValueState("Error");
                            // this.getView().byId(ci.ColumnName).setValueStateText("Required Field");
                        }
                    })
                    resolve();
                });
            },

            cancelHeaderEdit: function () {
                //confirm cancel edit of style header
                if (this._headerChanged) {
                    if (!this._DiscardHeaderChangesDialog) {
                        this._DiscardHeaderChangesDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.DiscardHeaderChanges", this);
                        this.getView().addDependent(this._DiscardHeaderChangesDialog);
                    }
                    jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                    this._DiscardHeaderChangesDialog.addStyleClass("sapUiSizeCompact");
                    this._DiscardHeaderChangesDialog.open();
                } else {
                    this.closeHeaderEdit();
                }
            },

            closeHeaderEdit: async function () {
                var me = this;
                //on cancel confirmed - close edit mode and reselect backend data
                var oJSONModel = new JSONModel();
                var data = {};
                that._headerChanged = false;
                that.setChangeStatus(false);
                data.editMode = false;
                oJSONModel.setData(data);
                that.getView().setModel(oJSONModel, "HeaderEditModeModel");

                if (that._DiscardHeaderChangesDialog) {
                    that._DiscardHeaderChangesDialog.close();
                }

                //Set Button Visibility for Read Mode
                // this.getView().byId("onIORefresh").setVisible(true);
                this.getView().byId("onIOEdit").setVisible(true);
                this.getView().byId("onIORelease").setVisible(true);

                this.byId("onIOEdit").setVisible(this.getView().getModel("ui").getProperty("/DisplayMode") === "display" ? false : true);
                this.byId("onIORelease").setVisible(this.getView().getModel("ui").getProperty("/DisplayMode") === "display" ? false : true);
                this.byId("btnEditAttach").setVisible(this.getView().getModel("ui").getProperty("/DisplayMode") === "display" ? false : true);

                // this.byId("onIOAttribEdit").setVisible(true);
                // this.byId("onIOStatEdit").setVisible(true);
                this.getView().byId("onIOSave").setVisible(false);
                this.getView().byId("onIOCancel").setVisible(false);

                this.unLock();

                //Enable Icon Tab Filters
                this.enableOtherTabs();

                var oIconTabBarIO = me.byId("idIconTabBarInlineIOHdr");
                // oIconTabBarIO.getItems().filter(item => item.getProperty("key") !== oIconTabBarIO.getSelectedKey())
                oIconTabBarIO.getItems().filter(item => item.getProperty("key"))
                    .forEach(item => item.setProperty("enabled", true));

                var feCName = "";
                this._aColumns["IOHDRTab"].forEach(ci => {
                    // console.log(ci.ColumnName);
                    if (ci.Mandatory === true && ci.Editable === true) {
                        feCName = "fe" + ci.ColumnName;
                        this.getView().byId(feCName)._oLabel.removeStyleClass("sapMLabelRequired");
                    }
                })

                await this.refreshHeaderData();

                // alert(this._ioNo);
                // alert(this._newIONo);
                if (this._ioNo === "NEW" && (this._newIONo !== "" || this._newIONo !== undefined)) {
                    // this.onNavBack();
                    var oHistory = History.getInstance();
                    var sPreviousHash = oHistory.getPreviousHash();

                    if (sPreviousHash !== undefined) {
                        window.history.go(-1);
                    } else {
                        var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                        oRouter.navTo("Routeioinit", {}, true);
                    }
                }

                var oMsgStrip = that.getView().byId('HeaderMessageStrip');
                oMsgStrip.setVisible(false);
            },

            //******************************************* */
            //VALUE HELP
            //******************************************* */

            onSeasonsValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._seasonsHelpDialog) {
                    that._seasonsHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.Seasons", that);
                    that._seasonsHelpDialog.attachSearch(that._seasonsGroupValueHelpSearch);
                    that.getView().addDependent(that._seasonsHelpDialog);
                }
                that._seasonsHelpDialog.open(sInputValue);
            },

            _seasonsGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("SEASONCD", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _seasonsGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onProdScenValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._prodscenHelpDialog) {
                    that._prodscenHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.ProdScen", that);
                    that._prodscenHelpDialog.attachSearch(that._prodscenGroupValueHelpSearch);
                    that.getView().addDependent(that._prodscenHelpDialog);
                }
                that._prodscenHelpDialog.open(sInputValue);
            },

            _prodscenGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("PRODSCEN", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _prodscenGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value

                    var sProdScen = this.getView().byId("PRODSCEN").getValue();

                    var oData = this.getView().getModel("ProdScenModel").oData;
                    // console.log("ProdScenModel");
                    // console.log(oData);
                    for (var i = 0; i < oData.results.length; i++) {
                        if (oData.results[i].PRODSCEN === sProdScen) {
                            // alert(oData.results[i].PRODPLANT);
                            this.getView().byId("PRODPLANT").setValue(oData.results[i].PRODPLANT);
                            this.getView().byId("TRADPLANT").setValue(oData.results[i].TRADPLANT);
                            this.getView().byId("PLANPLANT").setValue(oData.results[i].PLANPLANT);
                            this.getView().byId("FTYSALTERM").setValue(oData.results[i].FTY_SALES_TERM);
                            this.getView().byId("CUSSALTERM").setValue(oData.results[i].CUST_SALES_TERM);
                            this.getView().byId("SALESORG").setValue(oData.results[i].SALESORG);
                        }
                    }

                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onSoldToValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                var custGrp = this.getView().byId("CUSTGRP").getValue(); //get customer group value
                var salesGrp = this.getView().byId("SALESGRP").getValue(); //get customer group value
                that.inputId = oEvent.getSource().getId();
                if (!that._soldtoHelpDialog) {
                    that._soldtoHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.SoldTo", that);
                    that._soldtoHelpDialog.attachSearch(that._soldtoGroupValueHelpSearch);
                    that.getView().addDependent(that._soldtoHelpDialog);
                }

                //filter Sold-To by Customer Group
                this._soldtoHelpDialog.getBinding("items").filter([new Filter(
                    "Custgrp",
                    sap.ui.model.FilterOperator.EQ, custGrp
                )]);

                this._soldtoHelpDialog.getBinding("items").filter([new Filter(
                    "Salesgrp",
                    sap.ui.model.FilterOperator.EQ, salesGrp
                )]);

                that._soldtoHelpDialog.open(sInputValue);
            },

            _soldtoGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("Soldtocust", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _soldtoGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onBillToValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                var soldtoCust = this.getView().byId("SOLDTOCUST").getValue(); //get Sold-To Customer value
                console.log("onBillToValueHelp : " + soldtoCust);
                that.inputId = oEvent.getSource().getId();
                if (!that._billtoHelpDialog) {
                    that._billtoHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.BillTo", that);
                    that._billtoHelpDialog.attachSearch(that._billtoGroupValueHelpSearch);
                    that.getView().addDependent(that._billtoHelpDialog);
                }

                //filter Sold-To by Customer Group
                this._billtoHelpDialog.getBinding("items").filter([new Filter(
                    "Soldtocust",
                    sap.ui.model.FilterOperator.EQ, soldtoCust
                )]);
                that._billtoHelpDialog.open(sInputValue);
            },

            _billtoGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("Billtocust", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _billtoGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onShipToValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                var soldtoCust = this.getView().byId("SOLDTOCUST").getValue(); //get Sold-To Customer value
                console.log("onShipToValueHelp : " + soldtoCust);
                that.inputId = oEvent.getSource().getId();
                if (!that._shiptoHelpDialog) {
                    that._shiptoHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.ShipTo", that);
                    that._shiptoHelpDialog.attachSearch(that._shiptoGroupValueHelpSearch);
                    that.getView().addDependent(that._shiptoHelpDialog);
                }

                //filter Sold-To by Customer Group
                this._shiptoHelpDialog.getBinding("items").filter([new Filter(
                    "Soldtocust",
                    sap.ui.model.FilterOperator.EQ, soldtoCust
                )]);

                that._shiptoHelpDialog.open(sInputValue);
            },

            _shiptoGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("Shiptocust", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _shiptoGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onIOTypeValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._iotypeHelpDialog) {
                    that._iotypeHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.IOType", that);
                    that._iotypeHelpDialog.attachSearch(that._iotypeGroupValueHelpSearch);
                    that.getView().addDependent(that._iotypeHelpDialog);
                }
                that._iotypeHelpDialog.open(sInputValue);
            },

            _iotypeGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("IOTYPE", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _iotypeGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onProdTypeValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._prodtypeHelpDialog) {
                    that._prodtypeHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.ProdType", that);
                    that._prodtypeHelpDialog.attachSearch(that._prodtypeGroupValueHelpSearch);
                    that.getView().addDependent(that._prodtypeHelpDialog);
                }
                that._prodtypeHelpDialog.open(sInputValue);
            },

            _prodtypeGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("PRODTYP", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _prodtypeGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onStyleNoValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._stylenoHelpDialog) {
                    that._stylenoHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.StyleNo", that);
                    that._stylenoHelpDialog.attachSearch(that._stylenoGroupValueHelpSearch);
                    that.getView().addDependent(that._stylenoHelpDialog);
                }
                that._stylenoHelpDialog.open(sInputValue);
            },

            _stylenoGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("STYLENO", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _stylenoGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value

                    var sStyleNo = this.getView().byId("STYLENO").getValue();

                    var oData = this.getView().getModel("StyleNoModel").oData;
                    // console.log(oData);     
                    for (var i = 0; i < oData.results.length; i++) {
                        if (oData.results[i].STYLENO === sStyleNo) {
                            this.getView().byId("VERNO").setValue(oData.results[i].PRODPLANT);
                            this.getView().byId("PRODTYPE").setValue(oData.results[i].PRODTYP);
                            this.getView().byId("STYLECD").setValue(oData.results[i].STYLECD);
                            this.getView().byId("SEASONCD").setValue(oData.results[i].SEASONCD);
                            this.getView().byId("CUSTGRP").setValue(oData.results[i].CUSTGRP);
                            this.getView().byId("BASEUOM").setValue(oData.results[i].UOM);
                        }
                    }

                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onUOMValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._uomHelpDialog) {
                    that._uomHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.UOM", that);
                    that._uomHelpDialog.attachSearch(that._uomGroupValueHelpSearch);
                    that.getView().addDependent(that._uomHelpDialog);
                }
                that._uomHelpDialog.open(sInputValue);
            },

            _uomGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("MSEHI", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("MSEHL", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _uomGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onSalesOrgValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._salesorgHelpDialog) {
                    that._salesorgHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.SalesOrg", that);
                    that._salesorgHelpDialog.attachSearch(that._salesorgGroupValueHelpSearch);
                    that.getView().addDependent(that._salesorgHelpDialog);
                }
                that._salesorgHelpDialog.open(sInputValue);
            },

            _salesorgGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("SALESORG", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESCRIPTION", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _salesorgGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onSalesGrpValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._salesgrpHelpDialog) {
                    that._salesgrpHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.SalesGrp", that);
                    that._salesgrpHelpDialog.attachSearch(that._salesgrpGroupValueHelpSearch);
                    that.getView().addDependent(that._salesgrpHelpDialog);
                }
                that._salesgrpHelpDialog.open(sInputValue);
            },

            _salesgrpGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("SALESGRP", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _salesgrpGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onPlantValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._plantHelpDialog) {
                    that._plantHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.Plant", that);
                    that._plantHelpDialog.attachSearch(that._plantGroupValueHelpSearch);
                    that.getView().addDependent(that._plantHelpDialog);
                }
                that._plantHelpDialog.open(sInputValue);
            },

            _plantGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("PRODPLANT", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DECSRIPTION", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _plantGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onSalesTermValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._salestermHelpDialog) {
                    that._salestermHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.SalesTerm", that);
                    that._salestermHelpDialog.attachSearch(that._salestermGroupValueHelpSearch);
                    that.getView().addDependent(that._salestermHelpDialog);
                }
                that._salestermHelpDialog.open(sInputValue);
            },

            _salestermGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("FTYSALTERM", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DESCRIPTION", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _salestermGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onStyleCdValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._stylecdHelpDialog) {
                    that._stylecdHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.StyleCd", that);
                    that._stylecdHelpDialog.attachSearch(that._stylecdGroupValueHelpSearch);
                    that.getView().addDependent(that._stylecdHelpDialog);
                }
                that._stylecdHelpDialog.open(sInputValue);
            },

            _stylecdGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("STYLECD", sap.ui.model.FilterOperator.Contains, sValue));
                // orFilter.push(new sap.ui.model.Filter("DESC1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _seasonsGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onCustGrpValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._custgrpHelpDialog) {
                    that._custgrpHelpDialog = sap.ui.xmlfragment("zuiio2.view.fragments.CustGrp", that);
                    that._custgrpHelpDialog.attachSearch(that._custgrpGroupValueHelpSearch);
                    that.getView().addDependent(that._custgrpHelpDialog);
                }
                that._custgrpHelpDialog.open(sInputValue);
            },

            _custgrpGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("CUSTGRP", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("DECSRIPTION", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _custgrpGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            //******************************************* */
            // HEADER
            //******************************************* */

            onSelectChanged: function (oEvent) {
                var key = oEvent.getParameters().key;
                if (key == 'itfIOHDR') {
                    // console.log("Icon Tab Bar Select Changed");
                    this.onIORefresh("IOHDR");
                }
            },

            onIORefresh: async function (source) {
                var arg = source;

                // alert(arg);

                if (arg === "IOHDR") {
                    await this.refreshHeaderData();
                    // console.log(this.getView().getModel("headerData").getData());
                }
            },

            onIOEdit: async function (source) {
                var sSource = source;

                // var bProceed = await this.lock(this);
                // if (!bProceed) return;

                // return;

                if (sSource === "IOHDR") {
                    if (this.getView().getModel("ui").getProperty("/DisplayMode") === "change") {
                        await this.lock(this);
                    }

                    // console.log(this.getOwnerComponent().getModel("LockModel").getData().results[0].Type);
                    // console.log(this.getOwnerComponent().getModel("LockModel").getData().results[0].Message);

                    // console.log("Lock Type: " + this.getView().getModel("ui").getProperty("/LockType"));
                    // console.log("Lock Message: " + this.getView().getModel("ui").getProperty("/LockMessage"));
                    // if (this.getView().getModel("ui").getProperty("/LockType") !== "E" && this.getView().getModel("ui").getProperty("/LockType") !== "") {
                    if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {


                        //create new - only header is editable at first
                        await this.setHeaderEditMode();
                        this.getView().byId("onIOEdit").setVisible(false);
                        this.getView().byId("onIORelease").setVisible(false);
                        // this.getView().byId("onIOAttribEdit").setVisible(false);
                        // this.getView().byId("onIOStatEdit").setVisible(false);
                        this.getView().byId("onIOSave").setVisible(true);
                        this.getView().byId("onIOCancel").setVisible(true);
                        // console.log("onIOEdit3");

                        this.disableOtherTabs();

                        var oIconTabBarIO = this.byId("idIconTabBarInlineIOHdr");
                        oIconTabBarIO.getItems().filter(item => item.getProperty("key"))
                            .forEach(item => item.setProperty("enabled", false));

                        this._ioNo = this.getView().byId("IONO").getValue();

                    } else
                        MessageBox.error(this.getView().getModel("ui").getProperty("/LockMessage"));
                }
            },

            onIOSave: async function (source) {
                var me = this;
                var strStyleNo;
                var strVerNo;
                var sSource = source;
                var oModel = this.getOwnerComponent().getModel();

                if (sSource === "IOHDR") {

                    // //// RETRIEVE PRDCAL AND PRDLEADTM IF UI2 PRODDAYS/PRODWK/PLANMONTH VALUE IS BLANK
                    // let cntBlank = 0;

                    // if (this.getView().getModel("ui2").getProperty("/ProdWk") === "") {
                    //     if (this.isInputFieldBlank(inputField)) {
                    //         console.log("PRODSCEN");
                    //         cntBlank++;
                    //     }

                    //     inputField = this.getView().byId("PRODPLANT");
                    //     if (this.isInputFieldBlank(inputField)) {
                    //         console.log("PRODPLANT");
                    //         cntBlank++;
                    //     }

                    //     inputField = this.getView().byId("IOTYPE");
                    //     if (this.isInputFieldBlank(inputField)) {
                    //         console.log("IOTYPE");
                    //         cntBlank++;
                    //     }

                    //     let inputValue = this.getView().byId("CUSTDLVDT").getValue();
                    //     console.log(inputValue);
                    //     if (!Date.parse(inputValue)) {
                    //         console.log("CUSTDLVDT");
                    //         cntBlank++;
                    //     }

                    //     if (cntBlank === 0) { 
                    //         let txtWeaveTyp;
                    //         let txtProdPlant;
                    //         let txtProdScen = this.getView().byId("PRODSCEN").getValue();
                    //         let oData = this.getView().getModel("ProdScenModel").oData;
                    //         for (var i = 0; i < oData.results.length; i++) {
                    //             if (oData.results[i].PRODSCEN === txtProdScen) {
                    //                 txtWeaveTyp = oData.results[i].WVTYP;
                    //                 txtProdPlant = oData.results[i].PRODPLANT;
                    //             }
                    //         }

                    //         let txtIOType = this.getView().byId("IOTYPE").getValue();
                    //         if (txtProdPlant !== this.getView().byId("PRODPLANT").getValue()) {
                    //             txtProdPlant = this.getView().byId("PRODPLANT").getValue();
                    //         }

                    //         let fldCustDlvDt = this.getView().byId("CUSTDLVDT");
                    //         let CustDlvDtValue = new Date(fldCustDlvDt.getDateValue());

                    //         await new Promise((resolve, reject) => {
                    //             oModel.read("/PRDLEADTMSet", {
                    //                 urlParameters: {
                    //                     "$filter": "SBU eq '" + this._sbu + "' and IOTYPE eq '" + txtIOType + "' and EVENTCD eq 'ALL' and PLANTCD eq '" + txtProdPlant + "' and WEAVETYP eq '" + txtWeaveTyp + "'"
                    //                 },
                    //                 success: function (oData, response) {
                    //                     // me.getView().setModel(new JSONModel(oData), "PRDLEADTMModel");
                    //                     console.log("PRDLEADTMModel");
                    //                     console.log(oData);
                    //                     var dtProdStart = me.getView().byId("PRODSTART");
                    //                     oData.results.forEach(item => {
                    //                         CustDlvDtValue.setDate(CustDlvDtValue.getDate() - item.LEADTM);
                    //                         // me.getView().byId("PRODSTART").setValue(sapDateFormat.format(new Date(CustDlvDtValue)));
                    //                         me.getView().getModel("ui2").setProperty("/ProdDays", item.LEADTM);
                    //                         // dtProdStart.setDateValue(CustDlvDtValue);
                    //                     })

                    //                     resolve();
                    //                 },
                    //                 error: function (err) {
                    //                     resolve();
                    //                 }
                    //             })
                    //         })

                    //         inputField = this.getView().byId("PRODSTART");
                    //     // let vProdDt = new Date(inputField.getValue());
                    //     let vProdDt = sapDateFormat.format(new Date(inputField.getValue()));
                    //     let txtYear = new Date(inputField.getValue()).getFullYear();

                    //     console.log(vProdDt);
                    //     console.log(txtYear);

                    //     var dateFormatter = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    //         pattern: "yyyy-MM-dd'T'HH:mm:ss"
                    //     });

                    //     vProdDt = dateFormatter.format(new Date(vProdDt)); // 2023-04-23T00:00:00
                    //     console.log(vProdDt);

                    //     await new Promise((resolve, reject) => {
                    //         oModel.read("/PRDCALSet", {
                    //             urlParameters: {
                    //                 "$filter": "Plantcd eq '" + txtProdPlant + "' and Prodyr eq '" + txtYear + "' and Startdt eq datetime'" + vProdDt + "'"
                    //             },
                    //             success: function (oData, response) {
                    //                 console.log(oData);
                    //                 oData.results.forEach(item => {
                    //                     // me.getView().byId("PLANMONTH").setValue(item.Prodmo + "/" + item.Prodyr);
                    //                     me.getView().getModel("ui2").setProperty("/ProdWk", +item.Prodwk);
                    //                 })
                    //                 resolve();
                    //             },
                    //             error: function (err) {
                    //                 resolve();
                    //             }
                    //         })
                    //     })
                    //     }
                    // }

                    // console.log("this._validationErrors");
                    // console.log(me._validationErrors.length);
                    if (me._validationErrors.length === 0) {
                        var sErrMsg = "";
                        if (this._sbu.Length <= 0) sErrMsg = "SBU";
                        else if (this.getView().byId("STYLECD").getValue() === "") sErrMsg = "Style Code";
                        else if (this.getView().byId("PRODTYPE").getValue() === "") sErrMsg = "Product Type";
                        else if (this.getView().byId("PRODSCEN").getValue() === "") sErrMsg = "Production Scenario";
                        else if (this.getView().byId("PLANMONTH").getValue() === "") sErrMsg = "Prod. Period";
                        else if (this.getView().byId("IOTYPE").getValue() === "") sErrMsg = "IO Type";
                        else if (this.getView().byId("SALESGRP").getValue() === "") sErrMsg = "Sales Grp.";
                        // else if (this.getView().byId("IOSUFFIX").getValue() === "") sErrMsg = "IO Suffix";
                        else if (this.getView().byId("SEASONCD").getValue() === "") sErrMsg = "Season Code";
                        else if (this.getView().byId("CUSTGRP").getValue() === "") sErrMsg = "Customer Group";
                        else if (this.getView().byId("BASEUOM").getValue() === "") sErrMsg = "Base UOM";
                        else if (this.getView().byId("SOLDTOCUST").getValue() === "") sErrMsg = "Sold-To Customer";
                        else if (this.getView().byId("CUSTDLVDT").getValue() === "") sErrMsg = "Customer Dlv Date";
                        else if (this.getView().byId("PRODSTART").getValue() === "") sErrMsg = "Production Start";

                        if (sErrMsg.length > 0) {
                            sErrMsg += " is required."
                            sap.m.MessageBox.warning(sErrMsg);
                            return;
                        }

                        let iOrdQty = 0;
                        iOrdQty = +this.getView().byId("ORDQTY").getValue();
                        if (iOrdQty <= 0) {
                            sErrMsg = "Order Quantity must be greater than zero."
                            sap.m.MessageBox.warning(sErrMsg);
                            return;
                        }

                        if (sErrMsg.length > 0) {
                            sap.m.MessageBox.warning(sErrMsg);
                            return;
                        }

                        await this.getIOPrefixSet("ZGW_3DERP_RFC_SRV", this._sbu, "");

                        strStyleNo = this.getView().byId("STYLENO").getValue();
                        strVerNo = this.getView().byId("VERNO").getValue();

                        this.getView().byId("IODESC").setValue(this.getView().getModel("ui2").getProperty("/IODesc"));
                        this.getView().byId("IOPREFIX").setValue(this.getView().getModel("ui2").getProperty("/IOPrefix"));

                        var oParamIOHeaderData;
                        var IOQty = 0;

                        if (me.hasSDData === true) {
                            me.SalDocData.forEach(item => {
                                IOQty += +item.QTY;
                            })

                            oParamIOHeaderData = {
                                STYLECD: this.getView().byId("STYLECD").getValue(),
                                PRODTYPE: this.getView().byId("PRODTYPE").getValue(),
                                PRODSCEN: this.getView().byId("PRODSCEN").getValue(),
                                SALESORG: this.getView().byId("SALESORG").getValue(),
                                ORDQTY: this.getView().byId("ORDQTY").getValue() === "" ? "0" : this.getView().byId("ORDQTY").getValue(),
                                ACTUALQTY: this.getView().byId("ACTUALQTY").getValue() === "" ? "0" : this.getView().byId("ACTUALQTY").getValue(),
                                PLANMONTH: this.getView().byId("PLANMONTH").getValue(),
                                IOTYPE: this.getView().byId("IOTYPE").getValue(),
                                IOPREFIX: this.getView().byId("IOPREFIX").getValue(),
                                IODESC: this.getView().byId("IODESC").getValue(),
                                SBU: this._sbu,
                                SALESGRP: this.getView().byId("SALESGRP").getValue(),
                                PRODPLANT: this.getView().byId("PRODPLANT").getValue(),
                                FTYSALTERM: this.getView().byId("FTYSALTERM").getValue(),
                                REVORDQTY: this.getView().byId("REVORDQTY").getValue() === "" ? "0" : this.getView().byId("REVORDQTY").getValue(),
                                SHIPQTY: this.getView().byId("SHIPQTY").getValue() === "" ? "0" : this.getView().byId("SHIPQTY").getValue(),
                                PRODWK: this.getView().byId("PRODWK").getValue() === "" || this.getView().byId("PRODWK").getValue() === "0" ? 0 : +this.getView().byId("PRODWK").getValue(),
                                PRODDAYS: this.getView().byId("PRODDAYS").getValue() === "" || this.getView().byId("PRODDAYS").getValue() === "0" ? 0 : +this.getView().byId("PRODDAYS").getValue(),
                                IOSUFFIX: this.getView().byId("IOSUFFIX").getValue(),
                                SEASONCD: this.getView().byId("SEASONCD").getValue(),
                                CUSTGRP: this.getView().byId("CUSTGRP").getValue(),
                                TRADPLANT: this.getView().byId("TRADPLANT").getValue(),
                                CUSSALTERM: this.getView().byId("CUSSALTERM").getValue(),
                                BASEUOM: this.getView().byId("BASEUOM").getValue(),
                                PLANDLVDT: this.getView().byId("PLANDLVDT").getValue() === undefined || this.getView().byId("PLANDLVDT").getValue() === "" || this.getView().byId("PLANDLVDT").getValue() === null ? "" : sapDateFormat.format(new Date(this.getView().byId("PLANDLVDT").getValue())),
                                REFIONO: this.getView().byId("REFIONO").getValue(),
                                STYLENO: this.getView().byId("STYLENO").getValue(),
                                VERNO: this.getView().byId("VERNO").getValue(),
                                PLANPLANT: this.getView().byId("PLANPLANT").getValue(),
                                CUSTDLVDT: this.getView().byId("CUSTDLVDT").getValue() === undefined || this.getView().byId("CUSTDLVDT").getValue() === "" || this.getView().byId("CUSTDLVDT").getValue() === null ? "" : sapDateFormat.format(new Date(this.getView().byId("CUSTDLVDT").getValue())),
                                PLANQTY: this.getView().byId("PLANQTY").getValue() === "" ? "0" : this.getView().byId("PLANQTY").getValue(),
                                PRODSTART: this.getView().byId("PRODSTART").getValue() === undefined || this.getView().byId("PRODSTART").getValue() === "" || this.getView().byId("PRODSTART").getValue() === null ? "" : sapDateFormat.format(new Date(this.getView().byId("PRODSTART").getValue())),
                                REMARKS: this.getView().byId("REMARKS").getValue(),
                                SOLDTOCUST: this.getView().byId("SOLDTOCUST").getValue(),
                                STATUSCD: this.getView().byId("STATUSCD").getValue().length > 0 ? this.getView().byId("STATUSCD").getValue() : "CRT",
                                // PRODWK: this.getView().getModel("ui2").getProperty("/ProdWk"),
                                // PRODDAYS: this.getView().getModel("ui2").getProperty("/ProdDays")
                            };
                        } else {

                            oParamIOHeaderData = {
                                STYLECD: this.getView().byId("STYLECD").getValue(),
                                PRODTYPE: this.getView().byId("PRODTYPE").getValue(),
                                PRODSCEN: this.getView().byId("PRODSCEN").getValue(),
                                SALESORG: this.getView().byId("SALESORG").getValue(),
                                ORDQTY: this.getView().byId("ORDQTY").getValue() === "" ? "0" : this.getView().byId("ORDQTY").getValue(),
                                ACTUALQTY: this.getView().byId("ACTUALQTY").getValue() === "" ? "0" : this.getView().byId("ACTUALQTY").getValue(),
                                PLANMONTH: this.getView().byId("PLANMONTH").getValue(),
                                IOTYPE: this.getView().byId("IOTYPE").getValue(),
                                IOPREFIX: this.getView().byId("IOPREFIX").getValue(),
                                IODESC: this.getView().byId("IODESC").getValue(),
                                SBU: this._sbu,
                                SALESGRP: this.getView().byId("SALESGRP").getValue(),
                                PRODPLANT: this.getView().byId("PRODPLANT").getValue(),
                                FTYSALTERM: this.getView().byId("FTYSALTERM").getValue(),
                                REVORDQTY: this.getView().byId("REVORDQTY").getValue() === "" ? "0" : this.getView().byId("REVORDQTY").getValue(),
                                SHIPQTY: this.getView().byId("SHIPQTY").getValue() === "" ? "0" : this.getView().byId("SHIPQTY").getValue(),
                                PRODWK: this.getView().byId("PRODWK").getValue() === "" || this.getView().byId("PRODWK").getValue() === "0" ? 0 : +this.getView().byId("PRODWK").getValue(),
                                PRODDAYS: this.getView().byId("PRODDAYS").getValue() === "" || this.getView().byId("PRODDAYS").getValue() === "0" ? 0 : this.getView().byId("PRODDAYS").getValue(),
                                IOSUFFIX: this.getView().byId("IOSUFFIX").getValue(),
                                SEASONCD: this.getView().byId("SEASONCD").getValue(),
                                CUSTGRP: this.getView().byId("CUSTGRP").getValue(),
                                TRADPLANT: this.getView().byId("TRADPLANT").getValue(),
                                CUSSALTERM: this.getView().byId("CUSSALTERM").getValue(),
                                BASEUOM: this.getView().byId("BASEUOM").getValue(),
                                PLANDLVDT: this.getView().byId("PLANDLVDT").getValue() === undefined || this.getView().byId("PLANDLVDT").getValue() === "" || this.getView().byId("PLANDLVDT").getValue() === null ? "" : sapDateFormat.format(new Date(this.getView().byId("PLANDLVDT").getValue())),
                                REFIONO: this.getView().byId("REFIONO").getValue(),
                                STYLENO: this.getView().byId("STYLENO").getValue(),
                                VERNO: this.getView().byId("VERNO").getValue(),
                                PLANPLANT: this.getView().byId("PLANPLANT").getValue(),
                                CUSTDLVDT: this.getView().byId("CUSTDLVDT").getValue() === undefined || this.getView().byId("CUSTDLVDT").getValue() === "" || this.getView().byId("CUSTDLVDT").getValue() === null ? "" : sapDateFormat.format(new Date(this.getView().byId("CUSTDLVDT").getValue())),
                                PLANQTY: this.getView().byId("PLANQTY").getValue() === "" ? "0" : this.getView().byId("PLANQTY").getValue(),
                                PRODSTART: this.getView().byId("PRODSTART").getValue() === undefined || this.getView().byId("PRODSTART").getValue() === "" || this.getView().byId("PRODSTART").getValue() === null ? "" : sapDateFormat.format(new Date(this.getView().byId("PRODSTART").getValue())),
                                REMARKS: this.getView().byId("REMARKS").getValue(),
                                SOLDTOCUST: this.getView().byId("SOLDTOCUST").getValue(),
                                STATUSCD: this.getView().byId("STATUSCD").getValue().length > 0 ? this.getView().byId("STATUSCD").getValue() : "CRT",
                                // PRODWK: this.getView().getModel("ui2").getProperty("/ProdWk"),
                                // PRODDAYS: this.getView().getModel("ui2").getProperty("/ProdDays")
                            };
                        }

                        console.log("oParamIOHeaderData");
                        console.log(oParamIOHeaderData);

                        // var oModel = this.getOwnerComponent().getModel();

                        if (this._ioNo === "NEW") {
                            _promiseResult = new Promise((resolve, reject) => {
                                setTimeout(() => {
                                    oModel.create("/IOHDRSet", oParamIOHeaderData, {
                                        method: "POST",
                                        success: function (oData, oResponse) {
                                            _newIONo = oData.IONO;
                                            me._ioNo = oData.IONO;
                                            me.getView().getModel("ui2").setProperty("/currIONo", oData.IONO);
                                            me.getView().getModel("ui2").setProperty("/currStyleNo", strStyleNo);
                                            me.getView().getModel("ui2").setProperty("/currVerNo", strVerNo);

                                            // console.log("has SD Data - Save New IO 1");
                                            // console.log(me.hasSDData);
                                            if (me.hasSDData === true) {
                                                // console.log("has SD Data - Save New IO");
                                                // _promiseResult = new Promise((resolve, reject) => {
                                                setTimeout(() => {
                                                    me.SaveSDData(_newIONo);
                                                }, 100);
                                                // });
                                                // await _promiseResult;

                                                setTimeout(() => {
                                                    me.UpdateSD_IO(_newIONo);
                                                }, 100);
                                            }

                                            // setTimeout(() => {
                                            //     me.createIOPreCost(_newIONo);
                                            // }, 100);


                                            // console.log("NEW IO# " + me.getView().getModel("ui2").getProperty("/currIONo"));
                                            MessageBox.information("IO# " + _newIONo + " generated.");
                                            resolve();
                                        },
                                        error: function (err) {
                                            MessageBox.error("Error encountered when saving the IO");
                                            resolve();
                                        }
                                    });
                                }, 100);
                            });
                            await _promiseResult;
                        } else {
                            // console.log(oParamIOHeaderData);
                            _promiseResult = new Promise((resolve, reject) => {
                                setTimeout(() => {
                                    oModel.update("/IOHDRSet(IONO='" + me._ioNo + "')", oParamIOHeaderData, {
                                        method: "PUT",
                                        success: function (oData, oResponse) {
                                            _newIONo = me.getView().getModel("ui2").getProperty("/currIONo");

                                            MessageBox.information("IO# " + me.getView().getModel("ui2").getProperty("/currIONo") + " updated.");
                                            resolve();
                                        },
                                        error: function (err) {
                                            MessageBox.error("Error encountered when saving the IO");
                                            resolve();
                                        }
                                    });
                                }, 100);
                            });
                            await _promiseResult;
                        }

                        //Set Button Visibility for Read Mode
                        this.byId("onIOEdit").setVisible(true);
                        this.byId("onIORelease").setVisible(true);
                        // this.byId("onIOAttribEdit").setVisible(true);
                        // this.byId("onIOStatEdit").setVisible(true);
                        this.byId("onIOSave").setVisible(false);
                        this.byId("onIOCancel").setVisible(false);

                        //Enable Icon Tab Filters
                        this.enableOtherTabs();

                        // console.log("IO Save - cancelHeaderEdit");
                        setTimeout(() => {
                            this.cancelHeaderEdit();
                        }, 100);

                        var feCName = "";
                        this._aColumns["IOHDRTab"].forEach(ci => {
                            // console.log(ci.ColumnName);
                            if (ci.Mandatory === true && ci.Editable === true) {
                                feCName = "fe" + ci.ColumnName;
                                this.getView().byId(feCName)._oLabel.removeStyleClass("sapMLabelRequired");
                            }
                        })

                        // console.log("IO Save - idIconTabBarInlineIOHdr re-enable");
                        var oIconTabBarIO = this.byId("idIconTabBarInlineIOHdr");
                        oIconTabBarIO.getItems().filter(item => item.getProperty("key"))
                            .forEach(item => item.setProperty("enabled", true));

                        // console.log("IO Save - reload Header Data");
                        _promiseResult = new Promise((resolve, reject) => {
                            resolve(this.reloadHeaderData(_newIONo));
                        });
                        await _promiseResult;

                        // console.log("IO Save - closeHeaderEdit");
                        _promiseResult = new Promise((resolve, reject) => {
                            resolve(this.closeHeaderEdit());
                        });
                        await _promiseResult;

                        _promiseResult = new Promise((resolve, reject) => {
                            setTimeout(() => {
                                this.getIOSizes();
                            }, 100);
                            resolve();
                        });
                        await _promiseResult;

                        // console.log("IO Save - Refresh IO Data");
                        this.refreshIOData(_newIONo);

                        // console.log("IO Save - getReloadIOColumnProp");
                        _promiseResult = new Promise((resolve, reject) => {
                            resolve(this.getReloadIOColumnProp());
                        });
                        await _promiseResult;

                        // console.log("IO Save - getReloadIOColumnProp");
                        this.initStyle();

                        // console.log("IO Save - End");
                    } else {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                        return;
                    }
                }
            },

            isNumeric: function (value) {
                return /^-?\d+$/.test(value);
            },

            createIOPreCost: function (iono) {
                var me = this;
                let sIONO = iono;
                var entitySet = "/VariantSHSet";
                var csvcd;
                var cstype;
                var companycd;
                var csstat;
                var hasFilter = false;

                this._oModelIOCosting = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZGW_3DERP_IOCOSTING_SRV/");

                this._oModelIOCosting.setHeaders({
                    PRODPLANT: this.getView().byId("PRODPLANT").getValue()
                })

                if (hasFilter === false && this.getView().byId("CUSTGRP").getValue() !== "") {
                    hasFilter = true;
                    this._oModelIOCosting.read(entitySet, {
                        success: function (oData) {
                            oData.filter(fitem => fitem.CUSTGRP === this.getView().byId("CUSTGRP").getValue())
                                .forEach(costitem => {
                                    csvcd = costitem.CSVCD;
                                    cstype = costitem.CSTYPE;
                                    companycd = costitem.COMPANYCD;
                                    csstat = costitem.AUTOAPRV;
                                })
                        },
                        error: function (err) { }
                    })
                }

                if (hasFilter === false && this.getView().byId("PRODPLANT").getValue() !== "") {
                    hasFilter = true;
                    this._oModelIOCosting.read(entitySet, {
                        success: function (oData) {
                            oData.filter(fitem => fitem.PLANTCD === this.getView().byId("PRODPLANT").getValue())
                                .forEach(costitem => {
                                    csvcd = costitem.CSVCD;
                                    cstype = costitem.CSTYPE;
                                    companycd = costitem.COMPANYCD;
                                    csstat = costitem.AUTOAPRV;
                                })
                        },
                        error: function (err) { }
                    })
                }

                if (hasFilter === false) {
                    hasFilter = true;
                    this._oModelIOCosting.read(entitySet, {
                        success: function (oData) {
                            oData.filter(fitem => fitem.ZDEFAULT === "X")
                                .forEach(costitem => {
                                    csvcd = costitem.CSVCD;
                                    cstype = costitem.CSTYPE;
                                    companycd = costitem.COMPANYCD;
                                    csstat = costitem.AUTOAPRV;
                                })
                        },
                        error: function (err) { }
                    })
                }

                if (hasFilter) {
                    var oParam = {
                        "IONO": sIONO,
                        "CSTYPE": cstype,
                        "CSVCD": csvcd,
                        "VERDESC": "Initial Pre-Costing",
                        "SALESTERM": this.getView().byId("CUSSALTERM").getValue(),
                        "CSDATE": sapDateFormat.format(new Date()) + "T00:00:00",
                        "COSTSTATUS": csstat === true ? "REL" : "CRT"
                    }

                    this._oModelIOCosting.create("/VersionsSet", oParam, {
                        method: "POST",
                        success: function (oData) { },
                        error: function (err) { }
                    })
                }
            },

            UpdateSD_IO: function (iono) {
                var me = this;
                var sIONO = iono;
                var sdData = [];
                var entitySet = "/SALDOCDETSet";

                var oModel = me.getOwnerComponent().getModel();

                oModel.setUseBatch(true);
                oModel.setDeferredGroups(["update"]);

                var mParameters = {
                    "groupId": "update"
                }

                me.SalDocData.forEach(sditem => {
                    sdData = {
                        "SALESDOCNO": sditem.SALESDOCNO,
                        "SALESDOCITEM": +sditem.SALESDOCITEM,
                        "IONO": sIONO
                    }

                    oModel.update(entitySet + "(SALESDOCNO='" + sditem.SALESDOCNO + "',SALESDOCITEM=" + sditem.SALESDOCITEM + ")", sdData, mParameters);
                })

                oModel.submitChanges({
                    mParameters,
                    success: function (oData, oResponse) {
                    },
                    error: function (oData, oResponse) {
                        // console.log(oResponse);
                    }
                });
            },

            SaveSDData: function (iono) {
                var me = this;
                var sIONO = iono;
                var dlvData = [];
                var detData = [];
                var dlvSeq = 1;

                var dlventitySet = "/IODLVSet"
                var detentitySet = "/IODETSet"
                var oModel = me.getOwnerComponent().getModel();

                oModel.setUseBatch(true);
                oModel.setDeferredGroups(["insert"]);

                var mParameters = {
                    "groupId": "insert"
                };

                // console.log("SaveSDData");
                // console.log(me.SalDocData);

                me.uniqueIODLVData = me.SalDocData.filter((SalDocData, index, self) =>
                    index === self.findIndex((t) => (t.CPONO === SalDocData.CPONO && t.CPOREV === SalDocData.CPOREV
                        && t.DLVDT === SalDocData.DLVDT && t.CUSTSHIPTO === SalDocData.CUSTSHIPTO && t.CUSTBILLTO === SalDocData.CUSTBILLTO)));

                // console.log("uniqueIODLVData");
                // console.log(me.uniqueIODLVData);

                me.uniqueIODLVData.forEach(item => {
                    dlvData = {
                        "IONO": sIONO,
                        "CPONO": item.CPONO,
                        "CPOREV": item.CPOREV,
                        "CPOITEM": item.CPOITEM,
                        "CPODT": item.CPODT === "0000-00-00" || item.CPODT === "    -  -  " ? "" : dateFormat.format(new Date(item.CPODT)),
                        "DLVDT": item.DLVDT === "0000-00-00" || item.DLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.DLVDT)),
                        "REVDLVDT": item.DLVDT === "0000-00-00" || item.DLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.DLVDT)),
                        "CUSTSHIPTO": item.CUSTSHIPTO,
                        "CUSTBILLTO": item.CUSTBILLTO,
                        "SHIPMODE": item.SHIPMODE,
                        "PAYMETHOD": item.PAYMETHOD
                    }

                    // console.log(dlvData);
                    oModel.create(dlventitySet, dlvData, mParameters);

                    me.SalDocData.filter(sditem => sditem.CPONO === item.CPONO && sditem.CPOREV === item.CPOREV && sditem.DLVDT === item.DLVDT && sditem.CUSTSHIPTO === item.CUSTSHIPTO && sditem.CUSTBILLTO === item.CUSTBILLTO)
                        .forEach(detitem => {
                            detData = {
                                "IONO": sIONO,
                                "SALDOCNO": detitem.SALESDOCNO,
                                "SALDOCITEM": detitem.SALESDOCITEM,
                                "ORDERQTY": detitem.QTY,
                                "REVORDERQTY": detitem.QTY,
                                "ACTUALQTY": "0",
                                "PLANSHPQTY": "0",
                                "SHIPQTY": "0",
                                "REVDLVDT": item.DLVDT === "0000-00-00" || item.DLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.DLVDT)),
                                "DLVSEQ": dlvSeq + "",
                                "CUSTCOLOR": detitem.CUSTCOLOR,
                                "CUSTDEST": detitem.CUSTDEST,
                                "CUSTSIZE": detitem.CUSTSIZE,
                                "UNITPRICE1": detitem.UNITPRICE,
                                "UNITPRICE2": detitem.UNITPRICE,
                                "UNITPRICE3": detitem.UNITPRICE
                            }

                            // console.log(detData);
                            oModel.create(detentitySet, detData, mParameters);
                        });

                    dlvSeq++;
                })

                oModel.submitChanges({
                    mParameters,
                    // groupId: "insert",
                    success: function (oData, oResponse) {
                        // MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);
                    },
                    error: function (oData, oResponse) {
                        // console.log(oResponse);
                    }
                });

            },

            onIOCancel: async function (source) {
                var sSource = source;
                // alert(sSource);
                if (sSource === "IOHDR") {
                    //prompt Dialog for Cancel
                    // MessageBox.information("Cancel IO");
                    //if 
                    _promiseResult = new Promise((resolve, reject) => {

                        setTimeout(() => {
                            this.cancelHeaderEdit();
                        }, 100);

                        resolve();
                    })
                    await _promiseResult;

                    // var feCName = "";
                    // this._aColumns["IOHDRTab"].forEach(ci => {
                    //     // console.log(ci.ColumnName);
                    //     if (ci.Mandatory === true && ci.Editable === true) {
                    //         feCName = "fe" + ci.ColumnName;
                    //         this.getView().byId(feCName)._oLabel.removeStyleClass("sapMLabelRequired");
                    //     }
                    // })

                    // //Set Button Visibility for Read Mode
                    // this.byId("onIOEdit").setVisible(true);
                    // this.byId("onIORelease").setVisible(true);
                    // // this.byId("onIOAttribEdit").setVisible(true);
                    // // this.byId("onIOStatEdit").setVisible(true);
                    // this.byId("onIOSave").setVisible(false);
                    // this.byId("onIOCancel").setVisible(false);

                    // //Enable Icon Tab Filters
                    // this.enableOtherTabs();



                    // var oIconTabBarIO = this.byId("idIconTabBarInlineIOHdr");
                    // // oIconTabBarIO.getItems().filter(item => item.getProperty("key") !== oIconTabBarIO.getSelectedKey())
                    // oIconTabBarIO.getItems().filter(item => item.getProperty("key"))
                    //     .forEach(item => item.setProperty("enabled", true));

                    // // alert(this._ioNo);
                    // // alert(this._newIONo);
                    // if (this._ioNo === "NEW" && (this._newIONo !== "" || this._newIONo !== undefined)) {
                    //     // this.onNavBack();
                    //     var oHistory = History.getInstance();
                    //     var sPreviousHash = oHistory.getPreviousHash();

                    //     if (sPreviousHash !== undefined) {
                    //         window.history.go(-1);
                    //     } else {
                    //         var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                    //         oRouter.navTo("Routeioinit", {}, true);
                    //     }
                    // }

                }
            },

            onIORelease: async function (TableName) {
                sTableName = TableName;
                var oParam;
                var sIONo = this.getView().byId("IONO").getValue();
                var sStatusCd = this.getView().byId("STATUSCD").getValue();

                // alert(sStatusCd);
                await this.reloadModel("/IOCSCHECKSet", true, "hasCSData");

                // console.log(sStatusCd);
                // console.log(this.getView().getModel("ui2").getProperty("/hasCSData"));

                if (sStatusCd === "REL") {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["ERR_IOALREADYRELEASE"]);
                } else {

                    if (sStatusCd === "MAT" && this.getView().getModel("ui2").getProperty("/hasCSData") === true) {
                        // alert(this.getView().getModel("ui2").getProperty("/hasCSData"));
                        if (this.getView().getModel("ui").getProperty("/DisplayMode") === "change") {
                            await this.lock(this);
                        }

                        if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {
                            // alert(sTableName);
                            if (sTableName === "IOHDR") {
                                oParam = {
                                    "Iono": sIONo
                                };
                            }

                            var sEntitySet = "/Internal_CreateSet";
                            var sMethod = "POST";
                            var sMessage;
                            var resultType;
                            var resultDescription;

                            var oModelRelease = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");

                            oModelRelease.create(sEntitySet, oParam, {
                                method: sMethod,
                                success: function (oData, oResponse) {
                                    // console.log(oData);
                                    //capture oData output if needed
                                    resultType = oData.Type;
                                    resultDescription = oData.Description;

                                    //show MessageBox for successful execution
                                    setTimeout(() => {
                                        if (resultType === "E") {
                                            sap.m.MessageBox.error(resultDescription);
                                        }
                                        if (resultType !== "E") {
                                            sap.m.MessageBox.information(sIONo + " Released.");
                                        }
                                    }, 100);
                                },
                                error: function (err) {
                                    // console.log(err);
                                    this.unLock();
                                    resultDescription = err.responseText;
                                    sap.m.MessageBox.error(resultDescription);
                                }
                            });

                            // //reload data for both IO Delivery and IO Detail
                            // setTimeout(() => {
                            //     this.reloadHeaderData(sIONo);
                            // }, 100);

                            await this.reloadHeaderData();

                            await this.reloadIOData("StatDynTable", "/IOSTATSet");
                            this._bIOSTATChanged = false;

                            this.unLock();
                        } else
                            MessageBox.error(this.getView().getModel("ui").getProperty("/LockMessage"));
                    }
                    else
                        MessageBox.information(this.getView().getModel("ddtext").getData()["ERR_IORELEASE_REQ"]);
                }
            },

            //******************************************* */
            // DELIVERY SCHEDULE AND DETAILS
            //******************************************* */

            onAdd: async function (source) {
                var arg = source;

                await this.lock(this);
                if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {

                    // this.setRowReadMode(arg);
                    var vIONo = this.getView().getModel("ui2").getProperty("/currIONo");
                    var vDlvSeq = this.getView().getModel("ui2").getProperty("/currDlvSeq");

                    // this.getView().getModel("ui2").setProperty("/CustDlvDt", sap.ui.getCore().byId("CUSTDLVDT").getValue());

                    if (arg === "IODET") {
                        if (vDlvSeq === undefined || vDlvSeq === "999") {
                            MessageBox.information("select a Delivery Sequence");
                            return;
                        }
                    }

                    if (arg === "IODLV") {
                        this.byId("btnNewDlvSched").setVisible(false);
                        this.byId("btnImportPODlvSched").setVisible(false);
                        this.byId("btnEditDlvSched").setVisible(false);
                        this.byId("btnDeleteDlvSched").setVisible(false);
                        this.byId("btnCopyDlvSched").setVisible(false);
                        this.byId("btnRefreshDlvSched").setVisible(false);
                        this.byId("btnGenMatList").setVisible(false);
                        this.byId("btnSaveDlvSched").setVisible(true);
                        this.byId("btnCancelDlvSched").setVisible(true);
                        this.byId("btnFullScreenDlvSched").setVisible(false);

                        this.byId("btnNewIODet").setVisible(false);
                        this.byId("btnEditIODet").setVisible(false);
                        // this.byId("btnDeleteIODet").setVisible(false);
                        // this.byId("btnCopyIODet").setVisible(false);
                        this.byId("btnRefreshIODet").setVisible(false);
                        this.byId("btnSaveIODet").setVisible(false);
                        this.byId("btnCancelIODet").setVisible(false);
                        this.byId("btnFullScreenIODet").setVisible(false);
                    } else if (arg === "IODET") {
                        this.byId("btnNewDlvSched").setVisible(false);
                        this.byId("btnImportPODlvSched").setVisible(false);
                        this.byId("btnEditDlvSched").setVisible(false);
                        this.byId("btnDeleteDlvSched").setVisible(false);
                        this.byId("btnCopyDlvSched").setVisible(false);
                        this.byId("btnRefreshDlvSched").setVisible(false);
                        this.byId("btnGenMatList").setVisible(false);
                        this.byId("btnSaveDlvSched").setVisible(false);
                        this.byId("btnCancelDlvSched").setVisible(false);
                        this.byId("btnFullScreenDlvSched").setVisible(false);

                        this.byId("btnNewIODet").setVisible(false);
                        this.byId("btnEditIODet").setVisible(false);
                        // this.byId("btnDeleteIODet").setVisible(false);
                        // this.byId("btnCopyIODet").setVisible(false);
                        this.byId("btnRefreshIODet").setVisible(false);
                        this.byId("btnSaveIODet").setVisible(true);
                        this.byId("btnCancelIODet").setVisible(true);
                        this.byId("btnFullScreenIODet").setVisible(false);
                    }
                    // console.log("1");
                    var oIconTabBar = this.byId("idIconTabBarInlineMode");
                    oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                        .forEach(item => item.setProperty("enabled", false));

                    // console.log("2");
                    //GET TABLE
                    var aNewRow = [];
                    var oNewRow = { "ACTIVE": "X" };
                    var tabName = arg + "Tab";
                    var oTable = this.getView().byId(tabName);
                    // console.log("3");

                    oNewRow["New"] = true;
                    aNewRow.push(oNewRow);

                    //SET TABLE AS EDITABLE
                    if (arg === "IODET") {
                        this._aDataBeforeChange = jQuery.extend(true, [], this.byId(arg + "Tab").getModel("DataModel").getData().results);
                    }

                    if (arg !== "IODET") {
                        this._aDataBeforeChange = jQuery.extend(true, [], this.byId(arg + "Tab").getModel().getData().rows);
                    }

                    // console.log("4");
                    if (arg !== "IODET")
                        this.setActiveRowHighlightByTableId(arg + "Tab");

                    // console.log("5");
                    if (arg === "IODET") {
                        var oModel = this.getView().byId(tabName).getModel("DataModel");
                        var oData = aNewRow;

                        if (oModel.getData().results.length > 0) {
                            // oNewRow = {};

                            // Object.keys(oModel.getData().results[0]).forEach(prop => {
                            //     if (prop === "DELETED") oNewRow[prop] = false;
                            //     else oNewRow[prop] = "";
                            // })

                            // oNewRow["New"] = true;
                            // oData.push(oNewRow);

                            oModel.getData().results.forEach(item => {
                                item.New = false;
                                item.ACTIVE = "";
                                oData.push(item);
                            })
                        }
                        // else oData = aNewRow;

                        oModel.setProperty("/results", oData);

                    }

                    if (arg === "IODLV") {
                        var oTable = this.getView().byId(tabName);
                        var oModel = this.getView().byId(tabName).getModel();
                        var oData = aNewRow;

                        // console.log(oModel.getData());

                        if (oModel.getData().rows.length > 0) {

                            oModel.getData().rows.forEach(item => {
                                // alert(item.DLVSEQ);
                                item.New = false;

                                item.ACTIVE = "";
                                oData.push(item);
                            })
                        }
                        // console.log(oData);

                        oModel.setProperty("/rows", oData);

                    }

                    if (arg !== "IODET" && arg !== "IODLV") {
                        var oModel = this.getView().byId(tabName).getModel();
                        oModel.setProperty("/rows", aNewRow);
                    }

                    // console.log("6");
                    this.getView().getModel("ui").setProperty("/dataMode", 'NEW');
                    // console.log("7");

                    if (oTable.getBinding()) {
                        this._aFiltersBeforeChange = jQuery.extend(true, [], oTable.getBinding().aFilters);

                        // console.log("8");
                        // oTable.getBinding().aSorters = null;
                        oTable.getBinding().aFilters = null;
                    }
                    // console.log(this._aFiltersBeforeChange)
                    var oColumns = oTable.getColumns();
                    // console.log(oColumns);

                    // console.log("9");
                    for (var i = 0, l = oColumns.length; i < l; i++) {
                        var isFiltered = oColumns[i].getFiltered();
                        // console.log(oColumns[i].getFiltered())
                        if (isFiltered) {
                            oColumns[i].filter("");
                        }
                    }

                    this.setRowEditMode(arg);
                    this._validationErrors = [];
                    this._sTableModel = arg;
                    this._dataMode = "ADD";

                    // console.log("10");

                    // console.log(oTable);
                    // oTable.getBinding("rows").refresh();
                    // console.log("11");

                    // if (arg === "IODET") {
                    //     oTable.getModel("DataModel").refresh(true);
                    // }
                    // else
                    //     oTable.getModel().refresh(true);

                    // console.log("12");
                    // console.log(oTable);
                } else
                    MessageBox.error(this.getView().getModel("ui").getProperty("/LockMessage"));

            },

            onCopy: async function (TableName) {
                sTableName = TableName;
                // MessageBox.information(sTableName);

                var me = this;
                var oTable = this.byId(sTableName);
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var bProceed = true;
                var oParam;

                await me.lock(this);
                if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {

                    if (oSelectedIndices.length > 0) {
                        oSelectedIndices.forEach(item => {
                            oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                        })

                        oSelectedIndices = oTmpSelectedIndices;

                        if (sTableName === "IODLVTab") {
                            oSelectedIndices.forEach(item => {
                                sIONo = aData.at(item).IONO;
                                sDlvSeq = aData.at(item).DLVSEQ;

                                oParam = {
                                    "IONO": aData.at(item).IONO,
                                    "CPONO": aData.at(item).CPONO,
                                    "CPOREV": aData.at(item).CPOREV === "" ? "0" : aData.at(item).CPOREV,
                                    "CPOITEM": aData.at(item).CPOITEM === "" ? "0" : aData.at(item).CPOITEM,
                                    "CPODT": aData.at(item).CPODT,
                                    "DLVDT": aData.at(item).DLVDT,
                                    "REVDLVDT": aData.at(item).REVDLVDT,
                                    "CUSTSHIPTO": aData.at(item).CUSTSHIPTO,
                                    "CUSTBILLTO": aData.at(item).CUSTBILLTO,
                                    "HTSNO": aData.at(item).HTSNO,
                                    "SHIPMODE": aData.at(item).SHIPMODE,
                                    "PAYMETHOD": aData.at(item).PAYMETHOD,
                                    "LCNO": aData.at(item).LCNO,
                                    "LCDT": aData.at(item).LCDT,
                                    "BANK": aData.at(item).BANK,
                                    "NOTIFYPARTY": aData.at(item).NOTIFYPARTY,
                                    "ASNDOCNO": aData.at(item).ASNDOCNO,
                                    "ASNDT": aData.at(item).ASNDT
                                };
                            })
                        }

                        if (sTableName === "IODETTab") {
                            oSelectedIndices.forEach(item => {
                                sIONo = aData.at(item).IONO;
                                sIOItem = aData.at(item).IOITEM;

                                oParam = {
                                    "IONO": aData.at(item).IONO,
                                    "SALDOCNO": aData.at(item).SALDOCNO,
                                    "SALDOCITEM": aData.at(item).SALDOCITEM === "" ? "0" : aData.at(item).SALDOCITEM,
                                    "ORDERQTY": aData.at(item).ORDERQTY === "" ? "0" : aData.at(item).ORDERQTY,
                                    "REVORDERQTY": aData.at(item).REVORDERQTY === "" ? "0" : aData.at(item).REVORDERQTY,
                                    "ACTUALQTY": aData.at(item).ACTUALQTY === "" ? "0" : aData.at(item).ACTUALQTY,
                                    "PLANSHPQTY": aData.at(item).PLANSHPQTY === "" ? "0" : aData.at(item).PLANSHPQTY,
                                    "SHIPQTY": aData.at(item).SHIPQTY === "" ? "0" : aData.at(item).SHIPQTY,
                                    "MATNO": aData.at(item).MATNO,
                                    "BATCH": aData.at(item).BATCH,
                                    "REVDLVDT": aData.at(item).REVDLVDT,
                                    "CUSTCOLOR": aData.at(item).CUSTCOLOR,
                                    "CUSTDEST": aData.at(item).CUSTDEST,
                                    "CUSTSIZE": aData.at(item).CUSTSIZE,
                                    "UNITPRICE1": aData.at(item).UNITPRICE1 === "" ? "0" : aData.at(item).UNITPRICE1,
                                    "UNITPRICE2": aData.at(item).UNITPRICE2 === "" ? "0" : aData.at(item).UNITPRICE2,
                                    "UNITPRICE3": aData.at(item).UNITPRICE3 === "" ? "0" : aData.at(item).UNITPRICE3,
                                    "REVUPRICE1": aData.at(item).REVUPRICE1 === "" ? "0" : aData.at(item).REVUPRICE1,
                                    "REVUPRICE2": aData.at(item).REVUPRICE2 === "" ? "0" : aData.at(item).REVUPRICE2,
                                    "REVUPRICE3": aData.at(item).REVUPRICE3 === "" ? "0" : aData.at(item).REVUPRICE3,
                                    "DLVSEQ": aData.at(item).DLVSEQ === "" ? "0" : aData.at(item).DLVSEQ,
                                    "REMARKS": aData.at(item).REMARKS
                                };
                            })
                        }
                    }
                    // console.log(oParam);

                    var sEntitySet;
                    var sMethod;
                    if (sTableName === "IODLVTab") {
                        sEntitySet = "/IODLVSet";
                        sMethod = "POST";
                    }

                    if (sTableName === "IODETTab") {
                        sEntitySet = "/IODETSet";
                        sMethod = "POST";
                    }

                    var oModelCopy = this.getOwnerComponent().getModel();
                    // var oJSONModel = new JSONModel();
                    // var oView = this.getView();

                    oModelCopy.create(sEntitySet, oParam, {
                        method: sMethod,
                        success: function (oData, oResponse) {
                            //capture oData output if needed
                            sMessage = "Copy Successful";
                            //show MessageBox for successful execution
                            setTimeout(() => {
                                sap.m.MessageBox.information(sMessage);
                                me.unLock();
                            }, 100);
                        },
                        error: function (err) {
                            me.unLock();
                        }
                    });

                    //reload data for both IO Delivery and IO Detail
                    await this.reloadIOData("IODLVTab", "/IODLVSet");
                    this._bIODLVChanged = false;

                    // setTimeout(() => {
                    //     this.reloadIOData("IODETTab", "/IODETSet");
                    // }, 100);


                    me._tblChange = true;
                    await this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);
                    me._tblChange = false;


                    // var sText;
                    // var sOutput;
                    // if(sTableName === "IODLVTab"){
                    //     sText = "Copy Delivery Sequence " + sDlvSeq + "?";
                    //     sOutput = "Copy Successful";
                    // } else if(sTableName === "IODETTab"){
                    //     sText = "Copy Delivery Item " + sIOItem + "?";
                    // }
                    // var oDialogData = {
                    //     Action: "onCopy",
                    //     SourceTable:sTableName,
                    //     Text: sText,
                    //     Output: sOutput
                    // };

                    // var oJSONModel = new JSONModel();
                    // oJSONModel.setData(oDialogData);

                    // if(!this._ConfirmDialogIOfn){
                    //     this._ConfirmDialogIOfn = sap.ui.xmlfragment("zuiio2.vew.fragments.dialog.ConfirmDialogIOfn", this);
                    //     this._ConfirmDialogIOfn.setModel(oJSONModel);
                    //     this.getView().addDependent(this._ConfirmDialogIOfn);
                    // }
                    // else this._ConfirmDialogIOfn.setModel(oJSONModel);
                } else
                    MessageBox.error(this.getView().getModel("ui").getProperty("/LockMessage"));
            },

            onCloseConfirmDialogIOfn: function () {

                if (this._ConfirmDialogIOfn.getModel().getData().Action === "onCopy") {

                    this._ConfirmDialogIOfn.close();
                }
            },

            onCancelConfirmDialogIOfn: function () {
                this._ConfirmDialogIOfn.close();
            },

            onDelete: async function (TableName) {
                sTableName = TableName;
                // MessageBox.information(sTableName);

                var me = this;
                var oTable = this.byId(sTableName);
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var bProceed = true;

                if (oSelectedIndices.length <= 0) {
                    MessageBox.information("No data to delete.");
                    return;
                }

                if (oSelectedIndices.length > 0) {
                    await me.lock(me);
                    if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {
                        oSelectedIndices.forEach(item => {
                            oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                        })

                        oSelectedIndices = oTmpSelectedIndices;

                        if (sTableName === "IODLVTab") {
                            oSelectedIndices.forEach(item => {
                                sIONo = aData.at(item).IONO;
                                sDlvSeq = aData.at(item).DLVSEQ;
                                sDeleted = aData.at(item).DELETED;
                            })
                        }

                        if (sTableName === "IODETTab") {
                            oSelectedIndices.forEach(item => {
                                sIONo = aData.at(item).IONO;
                                sIOItem = aData.at(item).IOITEM;
                                sDeleted = aData.at(item).DELETED;
                            })
                        }

                        // console.log(sIONo);
                        // console.log(sDlvSeq);
                        // console.log(sIOItem);

                        if (sDeleted === true) {
                            MessageBox.information("Record already tagged as Deleted.");
                            return;
                        }

                        if (sIONo === "") {
                            MessageBox.information("No Row Selected");
                            me.closeLoadingDialog();
                        } else {

                            if (!this._ConfirmMarkAsDelete) {
                                this._ConfirmMarkAsDelete = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.ConfirmMarkAsDelete", this);
                                this.getView().addDependent(this._ConfirmMarkAsDelete);
                            }
                            jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                            this._ConfirmMarkAsDelete.addStyleClass("sapUiSizeCompact");
                            this._ConfirmMarkAsDelete.open();
                        }
                    } else
                        MessageBox.error(this.getView().getModel("ui").getProperty("/LockMessage"));
                }
            },

            onConfirmMarkAsDelete: async function () {
                var me = this;
                var oParam;
                var sEntitySet;
                var sMessage;

                // alert("Confirm Mark as Deleted");
                // console.log(sTableName);
                // console.log(sIONo);
                // console.log(sDlvSeq);
                // console.log(sIOItem);

                if (sTableName === "IODLVTab") {
                    sEntitySet = "/IODLVDELETESet(Iono='" + sIONo + "',Dlvseq=" + sDlvSeq + ")";
                    // console.log(sEntitySet)

                    oParam = {
                        "Iono": sIONo,
                        "Dlvseq": sDlvSeq,
                        "Deleted": "X"
                    };

                    // alert(sEntitySet);
                    // console.log(oParam);
                }

                if (sTableName === "IODETTab") {
                    sEntitySet = "/IODETSet(IONO='" + sIONo + "',IOITEM=" + sIOItem + ")";

                    oParam = {
                        "IONO": sIONo,
                        "IOITEM": sIOItem,
                        "DELETED": "X"
                    };

                    // alert(sEntitySet);
                    // alert(oParam);
                }

                // me._ConfirmMarkAsDelete.close();
                // return;

                var oMarkAsDeletedModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                oMarkAsDeletedModel.update(sEntitySet, oParam, {
                    method: "PUT",
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "MarkAsDeletedModel");
                        if (sTableName === "IODLVTab") { sMessage = "Delivery Seq " + sDlvSeq + " marked as deleted"; }
                        else if (sTableName === "IODETTab") { sMessage = "Delivery Item " + sDlvItem + " marked as deleted"; }

                        sap.m.MessageBox.information(sMessage);
                    },
                    error: function (err) { }
                });

                me._ConfirmMarkAsDelete.close();

                me.unLock();


                await this.reloadIOData("IODLVTab", "/IODLVSet");
                this._bIODLVChanged = false;

                // setTimeout(() => {
                //     this.reloadIOData("IODETTab", "/IODETSet");
                // }, 100);

                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();

                me._tblChange = true;
                // setTimeout(() => {
                await this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);
                me._tblChange = false;
            },

            reloadModel: async function (Entityset, IsUI2, ModelName) {
                var me = this;
                var sEntitySet = Entityset;
                var sIsUI2 = IsUI2;
                var sModelName = ModelName;
                var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");


                if (sModelName === "hasCSData") {
                    await new Promise((resolve, reject) => {
                        this._oModel.read(sEntitySet, {
                            urlParameters: {
                                "$filter": "Iono eq '" + cIONo + "'"
                            },
                            success: function (oData, response) {
                                // console.log("reload Model true");
                                // console.log(oData);
                                // console.log(oData.results.length);
                                if (oData.results.length > 0) {
                                    me.getView().getModel("ui2").setProperty("/hasCSData", true);
                                }
                                else {
                                    me.getView().getModel("ui2").setProperty("/hasCSData", false);
                                }
                                resolve();
                            },
                            error: function (err) {
                                me.getView().getModel("ui2").setProperty("/hasCSData", false);
                                // console.log("reload Model false");
                                // console.log(oData);
                                resolve();
                            }
                        })
                    });
                }
            },

            reloadIOData: async function (source, entityset) {
                var me = this;
                var sSource = source;
                var sEntitySet = entityset;

                // if (source !== "IODET") {
                //     this.byId(sSource)
                //         .setModel(new JSONModel({
                //             columns: [],
                //             rows: []
                //         }));
                // }

                // var ioNo = this._ioNo;
                var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");
                var cDlvSeq = this.getView().getModel("ui2").getProperty("/currDlvSeq");

                // console.log("reloadIOData");
                // console.log(cIONo);
                // console.log(cDlvSeq);

                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();

                if (source === "IODETTab") {

                    await this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);

                    await new Promise((resolve, reject) => {
                        this._oModel.read("/IODLVSet", {
                            urlParameters: {
                                "$filter": "IONO eq '" + cIONo + "'"
                            },
                            success: function (oData, response) {
                                // console.log("Reload IO Data");
                                // console.log(cIONo);
                                // console.log(oData);
                                oData.results.forEach(item => {
                                    item.CPODT = item.CPODT === "0000-00-00" || item.CPODT === "    -  -  " ? "" : dateFormat.format(new Date(item.CPODT));
                                    item.DLVDT = item.DLVDT === "0000-00-00" || item.DLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.DLVDT));
                                    item.REVDLVDT = item.REVDLVDT === "0000-00-00" || item.REVDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.REVDLVDT));
                                    item.CREATEDDT = item.CREATEDDT === "0000-00-00" || item.CREATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.CREATEDDT));
                                    item.UPDATEDDT = item.UPDATEDDT === "0000-00-00" || item.UPDATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.UPDATEDDT));
                                    item.DELETED = item.DELETED === "X" ? true : false;
                                })

                                oData.results.forEach((item, index) => {
                                    if (index === 0) {
                                        item.ACTIVE = "X"
                                        // console.log("index zero Delivery Sequence");
                                        // console.log(item.DLVSEQ);
                                        me.getView().getModel("ui2").setProperty("/currDlvSeq", item.DLVSEQ === undefined ? "999" : item.DLVSEQ);
                                    } else
                                        item.ACTIVE = ""
                                });

                                oData.results.sort((a, b,) => (a.DLVSEQ > b.DLVSEQ ? -1 : 1));

                                var aFilters = [], aSorters = [];
                                if (me.byId("IODETTab").getBinding("rows")) {
                                    aFilters = me.byId("IODETTab").getBinding("rows").aFilters;
                                    aSorters = me.byId("IODETTab").getBinding("rows").aSorters;
                                }

                                me.byId(sSource).getModel().setProperty("/rows", oData.results);
                                me.byId(sSource).bindRows("/rows");
                                me._tableRendered = sSource;

                                if (aFilters.length > 0) { me.setColumnFilters("IODynTable", aFilters); }
                                if (aSorters.length > 0) { me.setColumnSorters("IODynTable", aSorters); }

                                resolve();
                            },
                            error: function (err) {
                                // alert(err);
                                resolve();
                            }
                        })

                    });

                    // })
                    // await _promiseResult;

                    // console.log("reload Data new active Seq");
                    // console.log(me.getView().getModel("ui2").setProperty("/currDlvSeq"));


                } else {
                    await new Promise((resolve, reject) => {
                        this._oModel.read(sEntitySet, {
                            urlParameters: {
                                "$filter": "IONO eq '" + cIONo + "'"
                            },
                            success: function (oData, response) {
                                // console.log(oData);
                                if (sSource === "IOSTATUSTab") {
                                    oData.results.forEach(item => {
                                        item.UPDATEDDT = item.UPDATEDDT === "0000-00-00" || item.UPDATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.UPDATEDDT));
                                        item.UPDATEDTM = timeFormat.format(new Date(item.UPDATEDTM.ms + TZOffsetMs));
                                    })
                                }

                                if (sSource === "IODLVTab") {
                                    oData.results.forEach(item => {
                                        item.CPODT = item.CPODT === "0000-00-00" || item.CPODT === "    -  -  " ? "" : dateFormat.format(new Date(item.CPODT));
                                        item.DLVDT = item.DLVDT === "0000-00-00" || item.DLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.DLVDT));
                                        item.REVDLVDT = item.REVDLVDT === "0000-00-00" || item.REVDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.REVDLVDT));
                                        item.CREATEDDT = item.CREATEDDT === "0000-00-00" || item.CREATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.CREATEDDT));
                                        item.UPDATEDDT = item.UPDATEDDT === "0000-00-00" || item.UPDATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.UPDATEDDT));
                                    })
                                }

                                if (sSource === "IODETTab") {
                                    oData.results.forEach(item => {
                                        item.REVDLVDT = item.REVDLVDT === "0000-00-00" || item.REVDLVDT === "    -  -  " ? "" : dateFormat.format(new Date(item.REVDLVDT));
                                        item.CREATEDDT = item.CREATEDDT === "0000-00-00" || item.CREATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.CREATEDDT));
                                        item.UPDATEDDT = item.UPDATEDDT === "0000-00-00" || item.UPDATEDDT === "    -  -  " ? "" : dateFormat.format(new Date(item.UPDATEDDT));
                                    })

                                    oData.results.sort((a, b,) => (a.DLVITEM > b.DLVITEM ? -1 : 1));
                                }
                                // console.log("Reload IO Data");
                                // console.log(ioNo);
                                // console.log(oData);
                                oData.results.forEach((item, index) => {
                                    // console.log(item);
                                    if (index === 0) {
                                        item.ACTIVE = "X"
                                        // console.log("index zero Delivery Sequence");
                                        // console.log(item.DLVSEQ);
                                        me.getView().getModel("ui2").setProperty("/currDlvSeq", item.DLVSEQ === undefined ? "999" : item.DLVSEQ);
                                    } else
                                        item.ACTIVE = ""
                                });
                                me.byId(sSource).getModel().setProperty("/rows", oData.results);
                                me.byId(sSource).bindRows("/rows");
                                me._tableRendered = sSource;

                                resolve();
                            },
                            error: function (err) {
                                // alert(err);
                                resolve();
                            }
                        })
                        // resolve();
                    });

                    // })
                    // await _promiseResult;
                    // this.getReloadIOColumnProp();

                    // _promiseResult = new Promise((resolve, reject) => {
                    me._tblChange = true;
                    await this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);
                    await this.getIODynamicColumns("IODETMATLST", "ZDV_IODETMATLIST", "iodetMatTab", oColumns);
                    //     resolve();
                    // })
                    // await _promiseResult;

                    // console.log("reload Data new active Seq");
                    // console.log(me.getView().getModel("ui2").getProperty("/currDlvSeq"));

                }

                // this.getReloadIOColumnProp();
            },

            //******************************************* */
            // STYLE
            //******************************************* */

            initStyle() {
                // console.log("Init Style");
                this._oModelStyle = this.getOwnerComponent().getModel("ZGW_3DERP_IOSTYLE_SRV");
                // this._aColumns = {};
                // this._aDataBeforeChange = [];
                var me = this;

                let strStyle = this.getView().getModel("ui2").getProperty("/currStyleNo");
                let csAction = this.getView().getModel("ui").getProperty("/DisplayMode");
                // this._styleNo
                if (strStyle.trim() === "") {
                    // this.byId("btnCreateStyle").setVisible(true);
                    this.byId("btnManageStyle").setVisible(false);
                    this.byId("btnCreateStyle").setVisible(csAction === "display" ? false : true);
                }
                else {
                    this.byId("btnCreateStyle").setVisible(false);
                    this.byId("btnManageStyle").setVisible(true);
                }

                this.byId("colorTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                this.byId("processTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                this.byId("sizeTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                // this.byId("styleDetldBOMTab")
                //     .setModel(new JSONModel({
                //         columns: []
                //     }));

                this.byId("styleFabBOMTab")
                    .setModel(new JSONModel({
                        columns: []
                    }));

                this.byId("styleAccBOMTab")
                    .setModel(new JSONModel({
                        columns: []
                    }));

                this.byId("styleMatListTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                //pivot arrays
                this._colors;
                this._sizes;

                this.getStyleHeaderData();

                // this._oModelStyle.update("/CreateIOStyleSet('1000118')", { IONO: "1000118", STYLENO: "1000000461"  }, {
                //     success: function (oData, response) {},
                //     error: function (err) { }
                // })

                var vIONo = this._ioNo; //"1000115";
                vIONo = this.getView().getModel("ui2").getProperty("/currIONo");
                this._oModelStyle.read('/AttribSet', {
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "' and ATTRIBTYP eq 'COLOR'"
                    },
                    success: function (oData, response) {
                        oData.results.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");
                        me.byId("colorTab").getModel().setProperty("/rows", oData.results);
                        me.byId("colorTab").bindRows("/rows");
                        me._tableRendered = "colorTab";
                    },
                    error: function (err) { }
                })

                this._oModelStyle.read('/ProcessSet', {
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "'"
                    },
                    success: function (oData, response) {
                        oData.results.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");
                        me.byId("processTab").getModel().setProperty("/rows", oData.results);
                        me.byId("processTab").bindRows("/rows");
                        me._tableRendered = "processTab";
                    },
                    error: function (err) { }
                })

                this._oModelStyle.read('/AttribSet', {
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "' and ATTRIBTYP eq 'SIZE'"
                    },
                    success: function (oData, response) {
                        oData.results.forEach((item, index) => {
                            item.ACTIVE = index === 0 ? "X" : "";
                            item.BASEIND = item.BASEIND === "X" ? true : false;
                            item.DELETED = item.DELETED === "X" ? true : false;
                        });
                        me.byId("sizeTab").getModel().setProperty("/rows", oData.results);
                        me.byId("sizeTab").bindRows("/rows");
                        me._tableRendered = "sizeTab";
                    },
                    error: function (err) { }
                })

                this._oModelStyle.read('/UVSet', {
                    success: function (oData, response) {
                        me.getView().setModel(new JSONModel(oData), "UVModel");
                    },
                    error: function (err) { }
                })

                //get column value help prop
                this.getStyleColumnProp();

                // var oDDTextParam = [], oDDTextResult = {};
                // var oJSONModelDDText = new JSONModel();
                // var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                // oDDTextParam.push({ CODE: "CONFIRM_DISREGARD_CHANGE" });
                // oDDTextParam.push({ CODE: "INFO_NO_DATA_EDIT" });
                // oDDTextParam.push({ CODE: "COLORS" });
                // oDDTextParam.push({ CODE: "PROCESSES" });
                // oDDTextParam.push({ CODE: "SIZE" });
                // oDDTextParam.push({ CODE: "DTLDBOM" });
                // oDDTextParam.push({ CODE: "BOMBYUV" });
                // oDDTextParam.push({ CODE: "MATLIST" });
                // oDDTextParam.push({ CODE: "EDIT" });
                // oDDTextParam.push({ CODE: "SAVE" });
                // oDDTextParam.push({ CODE: "CANCEL" });
                // oDDTextParam.push({ CODE: "MANAGESTYLE" });
                // oDDTextParam.push({ CODE: "NEW" });
                // oDDTextParam.push({ CODE: "STYLEHDR" });
                // oDDTextParam.push({ CODE: "PARTCD" });
                // oDDTextParam.push({ CODE: "PARTDESC" });
                // oDDTextParam.push({ CODE: "MATTYP" });
                // oDDTextParam.push({ CODE: "GMC" });
                // oDDTextParam.push({ CODE: "GMCDESC" });
                // oDDTextParam.push({ CODE: "USGCLS" });
                // oDDTextParam.push({ CODE: "SEQNO" });
                // oDDTextParam.push({ CODE: "BOMITEM" });
                // oDDTextParam.push({ CODE: "MATTYPCLS" });
                // oDDTextParam.push({ CODE: "CONSUMP" });
                // oDDTextParam.push({ CODE: "WASTAGE" });
                // oDDTextParam.push({ CODE: "COLORCD" });
                // oDDTextParam.push({ CODE: "ATTRIBUTE" });
                // oDDTextParam.push({ CODE: "SIZECD" });
                // oDDTextParam.push({ CODE: "SIZEGRP" });
                // oDDTextParam.push({ CODE: "POCOLOR" });
                // oDDTextParam.push({ CODE: "DESC" });
                // oDDTextParam.push({ CODE: "USGCLS" });
                // oDDTextParam.push({ CODE: "INFO_CHECK_INVALID_ENTRIES" });
                // oDDTextParam.push({ CODE: "INFO_NO_DATA_MODIFIED" });
                // oDDTextParam.push({ CODE: "INFO_DATA_SAVE" });
                // oDDTextParam.push({ CODE: "SAVELAYOUT" });
                // oDDTextParam.push({ CODE: "INFO_LAYOUT_SAVE" });
                // oDDTextParam.push({ CODE: "FABBOM" });
                // oDDTextParam.push({ CODE: "ACCBOM" });
                // oDDTextParam.push({ CODE: "GENSTYLEMATLIST" });
                // oDDTextParam.push({ CODE: "INFO_IOMATLIST_GENERATED" });
                // oDDTextParam.push({ CODE: "INFO_NO_IOMATLIST_GENERATED" });
                // oDDTextParam.push({ CODE: "INFO_NO_DATA_TO_PROC" });
                // oDDTextParam.push({ CODE: "ASSIGNSAPMAT" });
                // oDDTextParam.push({ CODE: "AUTOASSIGNSAPMAT" });
                // oDDTextParam.push({ CODE: "CREATESAPMAT" });
                // oDDTextParam.push({ CODE: "REORDER" });
                // oDDTextParam.push({ CODE: "CLOSE" });
                // oDDTextParam.push({ CODE: "VENDOR" });
                // oDDTextParam.push({ CODE: "REORDERQTY" });
                // oDDTextParam.push({ CODE: "REMARKS" });
                // oDDTextParam.push({ CODE: "DELETED" });
                // oDDTextParam.push({ CODE: "ADD" });
                // oDDTextParam.push({ CODE: "INFO_NO_MATLIST" });
                // oDDTextParam.push({ CODE: "INFO_REORDER_CREATED" });
                // oDDTextParam.push({ CODE: "DELETE" });
                // oDDTextParam.push({ CODE: "INFO_DATA_DELETED" });
                // oDDTextParam.push({ CODE: "CREATEDBY" });
                // oDDTextParam.push({ CODE: "CREATEDDT" });
                // oDDTextParam.push({ CODE: "UPDATEDBY" });
                // oDDTextParam.push({ CODE: "UPDATEDDT" });
                // oDDTextParam.push({ CODE: "REFRESH" });
                // oDDTextParam.push({ CODE: "UNDELETE" });
                // oDDTextParam.push({ CODE: "INFO_SEL_RECORD_UNDELETED" });
                // oDDTextParam.push({ CODE: "INFO_SEL_RECORD_NOT_DELETED" });
                // oDDTextParam.push({ CODE: "INFO_INPUT_REQD_FIELDS" });
                // oDDTextParam.push({ CODE: "INFO_INVALID_IOMATLIST_GENERATED" });

                // oDDTextParam.push({ CODE: "CONFIRM_DISREGARD_CHANGE" });
                // oDDTextParam.push({ CODE: "INFO_NO_DATA_EDIT" });
                // oDDTextParam.push({ CODE: "COLORS" });
                // oDDTextParam.push({ CODE: "PROCESSES" });
                // oDDTextParam.push({ CODE: "SIZE" });
                // oDDTextParam.push({ CODE: "DTLDBOM" });
                // oDDTextParam.push({ CODE: "BOMBYUV" });
                // oDDTextParam.push({ CODE: "MATLIST" });
                // oDDTextParam.push({ CODE: "EDIT" });
                // oDDTextParam.push({ CODE: "SAVE" });
                // oDDTextParam.push({ CODE: "CANCEL" });
                // oDDTextParam.push({ CODE: "MANAGESTYLE" });
                // oDDTextParam.push({ CODE: "NEW" });
                // oDDTextParam.push({ CODE: "STYLEHDR" });
                // oDDTextParam.push({ CODE: "PARTCD" });
                // oDDTextParam.push({ CODE: "PARTDESC" });
                // oDDTextParam.push({ CODE: "MATTYP" });
                // oDDTextParam.push({ CODE: "GMC" });
                // oDDTextParam.push({ CODE: "GMCDESC" });
                // oDDTextParam.push({ CODE: "USGCLS" });
                // oDDTextParam.push({ CODE: "SEQNO" });
                // oDDTextParam.push({ CODE: "BOMITEM" });
                // oDDTextParam.push({ CODE: "MATTYPCLS" });
                // oDDTextParam.push({ CODE: "CONSUMP" });
                // oDDTextParam.push({ CODE: "WASTAGE" });
                // oDDTextParam.push({ CODE: "COLORCD" });
                // oDDTextParam.push({ CODE: "ATTRIBUTE" });
                // oDDTextParam.push({ CODE: "SIZECD" });
                // oDDTextParam.push({ CODE: "SIZEGRP" });
                // oDDTextParam.push({ CODE: "POCOLOR" });
                // oDDTextParam.push({ CODE: "DESC" });
                // oDDTextParam.push({ CODE: "USGCLS" });
                // oDDTextParam.push({ CODE: "INFO_CHECK_INVALID_ENTRIES" });
                // oDDTextParam.push({ CODE: "INFO_NO_DATA_MODIFIED" });
                // oDDTextParam.push({ CODE: "INFO_DATA_SAVE" });
                // oDDTextParam.push({ CODE: "SAVELAYOUT" });
                // oDDTextParam.push({ CODE: "INFO_LAYOUT_SAVE" });
                // oDDTextParam.push({ CODE: "SUBMITMRP" });
                // oDDTextParam.push({ CODE: "ASSIGNMATNO" });
                // oDDTextParam.push({ CODE: "EXCELEXPORT" });
                // oDDTextParam.push({ CODE: "FULLSCREEN" });
                // oDDTextParam.push({ CODE: "EXITFULLSCREEN" });
                // oDDTextParam.push({ CODE: "INFO_MATNO_ALREADY_EXIST" });
                // oDDTextParam.push({ CODE: "MATDESC1" });
                // oDDTextParam.push({ CODE: "UOM" });
                // oDDTextParam.push({ CODE: "MATNO" });
                // oDDTextParam.push({ CODE: "INFO_NO_RECORD_TO_PROC" });
                // oDDTextParam.push({ CODE: "INFO_MATNO_ASSIGNED" });
                // oDDTextParam.push({ CODE: "INFO_MRPDATA_CREATED" });
                // oDDTextParam.push({ CODE: "INFO_NO_SEL_RECORD_TO_PROC" });
                // oDDTextParam.push({ CODE: "INFO_MATERIAL_CREATED" });
                // oDDTextParam.push({ CODE: "INFO_IVALID_RECORD_FOR_MRP" });
                // oDDTextParam.push({ CODE: "INFO_SEL_RECORD_ALREADY_DELETED" });
                // oDDTextParam.push({ CODE: "INFO_DELETE_NOT_ALLOW" });
                // oDDTextParam.push({ CODE: "INFO_FF_REC_CANNOT_DELETE" });
                // oDDTextParam.push({ CODE: "INFO_NO_DELETE_PENDINGDOC" });
                // oDDTextParam.push({ CODE: "INFO_NO_DELETE_PLANTAVAIL" });
                // oDDTextParam.push({ CODE: "INFO_NO_DELETE_ISSTOPROD" });
                // oDDTextParam.push({ CODE: "INFO_FF_REC_DELETED" });
                // oDDTextParam.push({ CODE: "INFO_SEL_RECORD_DELETED" });
                // oDDTextParam.push({ CODE: "INFO_INVALID_RECORD_FOR_MATNO_CREATE" });

                // oDDTextParam.push({ CODE: "PRINT" });
                // oDDTextParam.push({ CODE: "RELCOSTING" });
                // oDDTextParam.push({ CODE: "CSTYPE" });
                // oDDTextParam.push({ CODE: "CSVCD" });
                // oDDTextParam.push({ CODE: "VERDESC" });
                // oDDTextParam.push({ CODE: "SALESTERM" });
                // oDDTextParam.push({ CODE: "CSDATE" });
                // oDDTextParam.push({ CODE: "CREATECOSTING" });
                // oDDTextParam.push({ CODE: "INFO_NO_DATA_TO_REFRESH" });
                // oDDTextParam.push({ CODE: "INFO_COSTING_RELEASE" });
                // oDDTextParam.push({ CODE: "INFO_STATUS_ALREADY_REL" });

                // oDDTextParam.push({ CODE: "IOITEM" });
                // oDDTextParam.push({ CODE: "SALDOCNO" });
                // oDDTextParam.push({ CODE: "SALDOCITEM" });
                // oDDTextParam.push({ CODE: "CUSTCOLOR" });
                // oDDTextParam.push({ CODE: "UNITPRICE1" });
                // oDDTextParam.push({ CODE: "UNITPRICE2" });
                // oDDTextParam.push({ CODE: "UNITPRICE3" });
                // oDDTextParam.push({ CODE: "REVUPRICE1" });
                // oDDTextParam.push({ CODE: "REVUPRICE2" });
                // oDDTextParam.push({ CODE: "REVUPRICE3" });
                // oDDTextParam.push({ CODE: "CUSTSIZE" });
                // oDDTextParam.push({ CODE: "REVORDERQTY" });
                // oDDTextParam.push({ CODE: "ORDERQTY" });
                // oDDTextParam.push({ CODE: "ACTUALQTY" });
                // oDDTextParam.push({ CODE: "PLANSHPQTY" });
                // oDDTextParam.push({ CODE: "SHIPQTY" });
                // oDDTextParam.push({ CODE: "MATNO" });
                // oDDTextParam.push({ CODE: "BATCH" });
                // oDDTextParam.push({ CODE: "REVDLVDT" });
                // oDDTextParam.push({ CODE: "CUSTDEST" });
                // oDDTextParam.push({ CODE: "DLVSEQ" });
                // oDDTextParam.push({ CODE: "REVDLVDT" });
                // oDDTextParam.push({ CODE: "INFO_CREATE_CHECK_REQD" });
                // oDDTextParam.push({ CODE: "ERR_IORELEASE_REQ" });
                // oDDTextParam.push({ CODE: "ERR_IOALREADYRELEASE" });
                // oDDTextParam.push({ CODE: "PLACEHOLDER_REQ" });                

                // // console.log(oDDTextParam);

                // setTimeout(() => {
                //     oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam }, {
                //         method: "POST",
                //         success: function (oData, oResponse) {
                //             oData.CaptionMsgItems.results.forEach(item => {
                //                 oDDTextResult[item.CODE] = item.TEXT;
                //             })

                //             oJSONModelDDText.setData(oDDTextResult);
                //             me.getView().setModel(oJSONModelDDText, "ddtext");
                //             me.getOwnerComponent().getModel("CAPTION_MSGS_MODEL").setData({ oDDTextResult })

                //             // console.log("oJSONModelDDText");
                //             // console.log(oJSONModelDDText);
                //         },
                //         error: function (err) {
                //             // sap.m.MessageBox.error(err);
                //         }
                //     });
                // }, 100);
            },

            getStyleHeaderData() {
                var me = this;
                var aStyleHdr = [];
                var oJSONModel = new JSONModel();
                // var vStyle = this._styleNo; //"1000000272";
                var vStyle = this.getView().getModel("ui2").getProperty("/currStyleNo"); //"1000000272";

                // console.log("getStyleHeaderData");
                // console.log(vStyle);
                setTimeout(() => {
                    this._oModelStyle.read('/HeaderSet', {
                        urlParameters: {
                            "$filter": "STYLENO eq '" + vStyle + "'"
                        },
                        success: function (oData, response) {
                            // me._styleVer = oData.results[0].VERNO;

                            me.getStyleColors();
                            me.getStyleDetailedBOM();
                            me.getStyleMaterialList();

                            var oModel = me.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                            var vSBU = me._sbu; //"VER"; 
                            // console.log(oData)
                            oModel.setHeaders({
                                sbu: vSBU,
                                type: "IOSTYLHDR",
                                tabname: "ZERP_STYLHDR"
                            });

                            oModel.read("/ColumnsSet", {
                                success: function (oDataCols, oResponse) {
                                    if (oDataCols.results.length > 0) {
                                        me._aColumns["header"] = oData.results;

                                        oDataCols.results.forEach(item => {
                                            aStyleHdr.push({
                                                KEY: item.ColumnName,
                                                LABEL: item.ColumnLabel,
                                                VALUE: oData.results[0][item.ColumnName],
                                                VISIBLE: item.Visible
                                            });
                                        })

                                        // Object.keys(oData.results[0]).forEach(key => {
                                        //     oDataCols.results.filter(fItem => fItem.ColumnName === key)
                                        //         .forEach(item => aStyleHdr.push({KEY: key, VALUE: oData.results[0][key], VISIBLE: item.Visible}))
                                        // })

                                        oJSONModel.setData(aStyleHdr);
                                        me.getView().setModel(oJSONModel, "styleHeader");
                                    }
                                },
                                error: function (err) { }
                            });
                        },
                        error: function (err) { }
                    })
                }, 100);
            },

            getStyleColumnProp: async function () {
                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();

                //get dynamic columns based on saved layout or ZERP_CHECK
                setTimeout(() => {
                    this.getStyleDynamicColumns("IOCOLOR", "ZERP_IOATTRIB", "colorTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getStyleDynamicColumns("IOPROCESS", "ZERP_IOPROC", "processTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getStyleDynamicColumns("IOSIZE", "ZERP_IOATTRIB", "sizeTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getStyleDynamicColumns("IOSTYLMATLIST", "ZERP_S_STYLMATLST", "styleMatListTab", oColumns);
                }, 100);

                // setTimeout(() => {
                //     this.getStyleDynamicColumns("IOSTYLDTLDBOM", "ZERP_S_STYLBOM", "styleDetldBOMTab", oColumns);
                // }, 100);

                setTimeout(() => {
                    this.getStyleDynamicColumns("IOSTYLDTLDBOM", "ZERP_S_STYLBOM", "styleFabBOMTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getStyleDynamicColumns("IOSTYLDTLDBOM", "ZERP_S_STYLBOM", "styleAccBOMTab", oColumns);
                }, 100);
            },

            getStyleDynamicColumns(arg1, arg2, arg3, arg4) {
                var me = this;
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var vSBU = this._sbu; //"VER"; //this.getView().getModel("ui").getData().sbu;

                oModel.setHeaders({
                    sbu: vSBU,
                    type: sType,
                    tabname: sTabName
                });

                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        // console.log(sTabId, oData)
                        if (oData.results.length > 0) {

                            if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                                oData.results.forEach(item => {
                                    oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                        .forEach(col => item.ValueHelp = col.ValueHelp)
                                })
                            }

                            me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                            me.setStyleTableColumns(sTabId, oData.results);
                        }
                    },
                    error: function (err) {
                    }
                });
            },

            setStyleTableColumns(arg1, arg2) {
                var me = this;
                var sTabId = arg1;
                var oColumns = arg2;
                var oTable = this.getView().byId(sTabId);

                oTable.getModel().setProperty("/columns", oColumns);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = me.getStyleColumnDesc(sTabId, context.getObject()); //context.getObject().ColumnLabel;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnDataType = context.getObject().DataType;

                    if (sColumnWidth === 0) sColumnWidth = 100;

                    if (sColumnDataType !== "BOOLEAN") {
                        return new sap.ui.table.Column({
                            id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),
                            template: new sap.m.Text({
                                text: sTabId === "styleFabBOMTab" || sTabId === "styleAccBOMTab" ? "{DataModel>" + sColumnId + "}" : "{" + sColumnId + "}",
                                wrapping: true,
                                tooltip: sColumnDataType === "BOOLEAN" ? "" : sTabId === "styleFabBOMTab" || sTabId === "styleAccBOMTab" ? "{DataModel>" + sColumnId + "}" : "{" + sColumnId + "}"
                            }),
                            width: sColumnWidth + "px",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                        });
                    }
                    else {
                        return new sap.ui.table.Column({
                            id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                            label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),
                            template: new sap.m.CheckBox({
                                selected: sTabId === "styleFabBOMTab" || sTabId === "styleAccBOMTab" ? "{DataModel>" + sColumnId + "}" : "{" + sColumnId + "}",
                                editable: false
                            }),
                            width: sColumnWidth + "px",
                            sortProperty: sColumnId,
                            filterProperty: sColumnId,
                            autoResizable: true,
                            visible: sColumnVisible,
                            sorted: sColumnSorted,
                            hAlign: "Center",
                            sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                        });
                    }
                });
            },

            getStyleDetailedBOM: function () {
                //get detailed bom data
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                var oJSONModelFAB = new JSONModel();
                var oJSONModelACC = new JSONModel();
                var oTableFAB = this.getView().byId("styleFabBOMTab");
                var oTableACC = this.getView().byId("styleAccBOMTab");
                var rowDataFAB = { items: [] };
                var rowDataACC = { items: [] };
                var dataFAB = { results: rowDataFAB };
                var dataACC = { results: rowDataACC };
                var entitySet = "/StyleDetailedBOMSet"
                // console.log(this._styleVer)
                oModel.setHeaders({
                    // styleno: this._styleNo, //"1000000272",
                    styleno: this.getView().getModel("ui2").getProperty("/currStyleNo"),
                    verno: this.getView().getModel("ui2").getProperty("/currVerNo") //"1"
                });
                // console.log(this._styleNo, this._styleVer);
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        me._oModelStyle.read('/MatTypeSet', {
                            success: function (oDataMT, response) {
                                var aFAB = oDataMT.results.filter(fItem => fItem.Mattypgrp === "FAB");
                                var aACC = oDataMT.results.filter(fItem => fItem.Mattypgrp === "ACC");

                                var aFABBOM = [];
                                var aACCBOM = [];

                                aFAB.forEach(item => {
                                    oData.results.filter(fItem => fItem.Mattyp === item.Mattyp).forEach(e => aFABBOM.push(e))
                                });

                                aACC.forEach(item => {
                                    oData.results.filter(fItem => fItem.Mattyp === item.Mattyp).forEach(e => aACCBOM.push(e))
                                });

                                var aDataFAB = [];

                                aFABBOM.forEach((item, index) => {
                                    var oTmpData = {};

                                    Object.keys(oData.results[0]).forEach(key => {
                                        oTmpData[key.toUpperCase()] = item[key];
                                    })

                                    oTmpData["ACTIVE"] = index === 0 ? "X" : "";
                                    aDataFAB.push(oTmpData);
                                })

                                //build the tree table based on selected data
                                var style, gmc, partcd;
                                var item = {};
                                var item2 = {};
                                var items = [];
                                var items2 = [];

                                for (var i = 0; i < aDataFAB.length; i++) {
                                    if (aDataFAB[i].BOMITMTYP === Constants.STY) { //highest level is STY

                                        item = aDataFAB[i];
                                        items = [];
                                        style = aDataFAB[i].BOMSTYLE;

                                        //add GMC items under the Style, add as child
                                        for (var j = 0; j < aDataFAB.length; j++) {
                                            if (aDataFAB[j].BOMITMTYP === Constants.GMC && aDataFAB[j].BOMSTYLE === style) {

                                                items2 = [];
                                                item2 = aDataFAB[j];
                                                gmc = aDataFAB[j].GMC;
                                                partcd = aDataFAB[j].PARTCD;

                                                //add MAT items under the GMC, add as child
                                                for (var k = 0; k < aDataFAB.length; k++) {
                                                    if (aDataFAB[k].BOMITMTYP === Constants.MAT && aDataFAB[k].GMC === gmc && aDataFAB[k].PARTCD === partcd) {
                                                        items2.push(aDataFAB[k]);
                                                    }
                                                }

                                                item2.items = items2;
                                                items.push(item2);
                                            }
                                        }

                                        item.items = items;
                                        rowDataFAB.items.push(item);

                                    } else if (aDataFAB[i].BOMITMTYP === Constants.GMC && aDataFAB[i].BOMSTYLE === '') {
                                        //for GMC type, immediately add item
                                        items = [];
                                        item = aDataFAB[i];
                                        gmc = aDataFAB[i].GMC;
                                        partcd = aDataFAB[i].PARTCD;

                                        //add MAT items under the GMC, add as child
                                        for (var k = 0; k < aDataFAB.length; k++) {
                                            if (aDataFAB[k].BOMITMTYP === Constants.MAT && aDataFAB[k].GMC === gmc && aDataFAB[k].PARTCD === partcd) {
                                                items.push(aDataFAB[k]);
                                            }
                                        }

                                        item.items = items;
                                        rowDataFAB.items.push(item);
                                    }
                                }

                                oJSONModelFAB.setData(dataFAB);
                                oTableFAB.setModel(oJSONModelFAB, "DataModel");

                                var aDataACC = [];

                                aACCBOM.forEach((item, index) => {
                                    var oTmpData = {};

                                    Object.keys(oData.results[0]).forEach(key => {
                                        oTmpData[key.toUpperCase()] = item[key];
                                    })

                                    oTmpData["ACTIVE"] = index === 0 ? "X" : "";
                                    aDataACC.push(oTmpData);
                                })

                                //build the tree table based on selected data
                                style = "", gmc = "", partcd = "";
                                item = {};
                                item2 = {};

                                for (var i = 0; i < aDataACC.length; i++) {
                                    if (aDataACC[i].BOMITMTYP === Constants.STY) { //highest level is STY

                                        item = aDataACC[i];
                                        items = [];
                                        style = aDataACC[i].BOMSTYLE;

                                        //add GMC items under the Style, add as child
                                        for (var j = 0; j < aDataACC.length; j++) {
                                            if (aDataACC[j].BOMITMTYP === Constants.GMC && aDataACC[j].BOMSTYLE === style) {

                                                items2 = [];
                                                item2 = aDataACC[j];
                                                gmc = aDataFaDataACCAB[j].GMC;
                                                partcd = aDataACC[j].PARTCD;

                                                //add MAT items under the GMC, add as child
                                                for (var k = 0; k < aDataACC.length; k++) {
                                                    if (aDataACC[k].BOMITMTYP === Constants.MAT && aDataACC[k].GMC === gmc && aDataACC[k].PARTCD === partcd) {
                                                        items2.push(aDataACC[k]);
                                                    }
                                                }

                                                item2.items = items2;
                                                items.push(item2);
                                            }
                                        }

                                        item.items = items;
                                        rowDataACC.items.push(item);

                                    } else if (aDataACC[i].BOMITMTYP === Constants.GMC && aDataACC[i].BOMSTYLE === '') {
                                        //for GMC type, immediately add item
                                        items = [];
                                        item = aDataACC[i];
                                        gmc = aDataACC[i].GMC;
                                        partcd = aDataACC[i].PARTCD;

                                        //add MAT items under the GMC, add as child
                                        for (var k = 0; k < aDataACC.length; k++) {
                                            if (aDataACC[k].BOMITMTYP === Constants.MAT && aDataACC[k].GMC === gmc && aDataACC[k].PARTCD === partcd) {
                                                items.push(aDataACC[k]);
                                            }
                                        }

                                        item.items = items;
                                        rowDataACC.items.push(item);
                                    }
                                }

                                oJSONModelACC.setData(dataACC);
                                oTableACC.setModel(oJSONModelACC, "DataModel");
                            },
                            error: function (err) { }
                        })
                    },
                    error: function () {
                    }
                })
            },

            getStyleMaterialList: function () {
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                var me = this;

                oModel.setHeaders({
                    // styleno: this._styleNo, //"1000000272",
                    styleno: this.getView().getModel("ui2").getProperty("/currStyleNo"), //"1000000272",
                    verno: this.getView().getModel("ui2").getProperty("/currVerNo") //"1"
                });
                // console.log(this._styleNo, this._styleVer);
                oModel.read('/StyleMaterialListSet', {
                    success: function (oData, response) {
                        // console.log(oData)
                        var aData = [];

                        oData.results.forEach((item, index) => {
                            var oTmpData = {};

                            Object.keys(oData.results[0]).forEach(key => {
                                oTmpData[key.toUpperCase()] = item[key];
                            })

                            oTmpData["ACTIVE"] = index === 0 ? "X" : "";
                            aData.push(oTmpData);
                        })

                        // me.byId("styleMatListTab").setVisibleRowCount(aData.length);
                        me.byId("styleMatListTab").getModel().setProperty("/rows", aData);
                        me.byId("styleMatListTab").bindRows("/rows");
                        me._tableRendered = "styleMatListTab";
                    },
                    error: function (err) { }
                })
            },

            getStyleColors: function () {
                // console.log("get color attributes");
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                let paramStyle = this.getView().getModel("ui2").getProperty("/currStyleNo");

                oModel.setHeaders({
                    // styleno: this._styleNo //"1000000272"
                    styleno: paramStyle //"1000000272"
                });

                oModel.read("/StyleAttributesColorSet", {
                    success: function (oData, oResponse) {
                        me._colors = oData.results;
                        me.getStyleSizes();
                    },
                    error: function (err) { }
                });
            },

            getStyleSizes: function () {
                // console.log("get sizes attributes");
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                let paramStyle = this.getView().getModel("ui2").getProperty("/currStyleNo");

                oModel.setHeaders({
                    // styleno: this._styleNo //"1000000272"
                    styleno: paramStyle //"1000000272"
                });

                oModel.read("/StyleAttributesSizeSet", {
                    success: function (oData, oResponse) {
                        me._sizes = oData.results;
                        me.getStyleBOMUV();
                    },
                    error: function (err) { }
                });
            },

            getStyleBOMUV: function () {
                // console.log("get BOM by UV");
                var me = this;
                var columnData = [];
                var oModelUV = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                var usageClass = this.getView().byId("UsageClassCB").getSelectedKey();
                // console.log(usageClass)
                oModelUV.setHeaders({
                    sbu: this._sbu, //"VER",
                    type: "IOSTYLBOMUV",
                    usgcls: usageClass
                });

                var pivotArray;
                if (usageClass === Constants.AUV) { //for AUV, pivot will be colors
                    pivotArray = me._colors;
                } else {
                    pivotArray = me._sizes;
                }

                // console.log("get dynamic columns of BOM by UV");
                oModelUV.read("/DynamicColumnsSet", {
                    success: function (oData, oResponse) {
                        var columns = oData.results;
                        var pivotRow;
                        //find the column to pivot
                        for (var i = 0; i < columns.length; i++) {
                            if (columns[i].Pivot !== '') {
                                pivotRow = columns[i].Pivot;
                            }
                        }
                        //build the table dyanmic columns
                        for (var i = 0; i < columns.length; i++) {
                            if (columns[i].Pivot === pivotRow) {
                                //pivot the columns
                                for (var j = 0; j < pivotArray.length; j++) {
                                    columnData.push({
                                        "ColumnName": pivotArray[j].Attribcd,
                                        "ColumnDesc": pivotArray[j].Desc1,
                                        "ColumnWidth": 125,
                                        "ColumnType": pivotRow,
                                        "Editable": false,
                                        "Mandatory": false,
                                        "Visible": true,
                                        "Sorted": false,
                                        "SortOrder": "ASC"
                                    })
                                }
                            } else {
                                if (columns[i].ColumnName !== pivotRow) {
                                    if (columns[i].Visible === true) {
                                        columnData.push({
                                            "ColumnName": columns[i].ColumnName,
                                            "ColumnDesc": columns[i].ColumnName,
                                            "ColumnWidth": columns[i].ColumnWidth,
                                            "ColumnType": columns[i].ColumnType,
                                            "Editable": columns[i].Editable,
                                            "Mandatory": columns[i].Mandatory,
                                            "Sorted": columns[i].Sorted,
                                            "SortOrder": columns[i].SortOrder
                                        })
                                    }
                                }
                            }
                        }

                        me.getBOMUVTableData(columnData, pivotArray);
                    },
                    error: function (err) {
                        Common.closeLoadingDialog(that);
                    }
                });
            },

            getBOMUVTableData: function (columnData, pivot) {
                // console.log("Get BOM by UV actual data");
                var me = this;
                var oTable = this.getView().byId("styleBOMUVTab");
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_SRV");
                var usageClass = this.getView().byId("UsageClassCB").getSelectedKey();

                oModel.setHeaders({
                    // styleno: this._styleNo, //"1000000272",
                    styleno: this.getView().getModel("ui2").getProperty("/currStyleNo"),
                    verno: this.getView().getModel("ui2").getProperty("/currVerNo"),
                    usgcls: usageClass
                });
                // console.log(this._styleNo, this._styleVer, usageClass);
                oModel.read("/StyleBOMUVSet", {
                    success: function (oData, oResponse) {
                        var rowData = oData.results;
                        // console.log(rowData)
                        //Get unique items of BOM by UV
                        var unique = rowData.filter((rowData, index, self) =>
                            index === self.findIndex((t) => (t.GMC === rowData.GMC && t.PARTCD === rowData.PARTCD && t.MATTYPCLS === rowData.MATTYPCLS)));

                        //For every unique item
                        for (var i = 0; i < unique.length; i++) {

                            //Set the pivot column for each unique item
                            for (var j = 0; j < rowData.length; j++) {
                                if (rowData[j].DESC1 !== "") {
                                    if (unique[i].GMC === rowData[j].GMC && unique[i].PARTCD === rowData[j].PARTCD && unique[i].MATTYPCLS === rowData[j].MATTYPCLS) {
                                        for (var k = 0; k < pivot.length; k++) {
                                            var colname = pivot[k].Attribcd;
                                            if (rowData[j].COLOR === colname) {
                                                unique[i][colname] = rowData[j].DESC1;
                                            } else if (rowData[j].SZE === colname) {
                                                unique[i][colname] = rowData[j].DESC1;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        //set the table columns/rows
                        rowData = oData.results;
                        unique.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData({
                            results: unique,
                            columns: columnData
                        });
                        oTable.setModel(oJSONModel, "DataModel");
                        // oTable.setVisibleRowCount(unique.length);
                        oTable.attachPaste();
                        oTable.bindColumns("DataModel>/columns", function (sId, oContext) {
                            var column = oContext.getObject();
                            var sColumnWidth = column.ColumnWidth;

                            if (sColumnWidth === 0) sColumnWidth = 100;

                            return new sap.ui.table.Column({
                                id: "styleBOMUVCol" + column.ColumnName,
                                label: new sap.m.Text({ text: me.getStyleColumnDesc("styleBOMUVTab", column), wrapping: true }),
                                template: me.styleColumnTemplate('UV', column),
                                sortProperty: column.ColumnName,
                                filterProperty: column.ColumnName,
                                width: sColumnWidth + "px",
                                autoResizable: true,
                                visible: column.Visible,
                                sorted: column.Sorted,
                                hAlign: column.ColumnName === "SEQNO" || column.ColumnName === "CONSUMP" || column.ColumnName === "WASTAGE" ? "End" : "Begin",
                                sortOrder: ((column.Sorted === true) ? column.SortOrder : "Ascending")
                            });
                        });
                        oTable.bindRows("DataModel>/results");
                        // console.log("BOM by UV Pivot");
                        // console.log(oTable);

                        Common.closeLoadingDialog(me);
                    },
                    error: function (err) {
                        Common.closeLoadingDialog(me);
                    }
                });
            },

            getStyleColumnDesc: function (arg1, arg2) {
                var desc;
                var sTabId = arg1;
                var oColumn = arg2;

                // console.log(this.getView().getModel("ddtext").getData())
                if (sTabId === "styleBOMUVTab") {
                    if (oColumn.ColumnType === Constants.COLOR || oColumn.ColumnType === Constants.SIZE) desc = oColumn.ColumnDesc;
                    else desc = this.getView().getModel("ddtext").getData()[oColumn.ColumnName];
                }
                else if (sTabId === "colorTab") {
                    if (oColumn.ColumnName === "ATTRIBCD") desc = this.getView().getModel("ddtext").getData()["COLORCD"];
                    else if (oColumn.ColumnName === "DESC1") desc = this.getView().getModel("ddtext").getData()["DESC"];
                    else if (oColumn.ColumnName === "CPOATRIB") desc = this.getView().getModel("ddtext").getData()["POCOLOR"];
                    else desc = oColumn.ColumnLabel;
                }
                else if (sTabId === "sizeTab") {
                    if (oColumn.ColumnName === "ATTRIBCD") desc = this.getView().getModel("ddtext").getData()["SIZECD"];
                    else if (oColumn.ColumnName === "DESC1") desc = this.getView().getModel("ddtext").getData()["DESC"];
                    else if (oColumn.ColumnName === "ATTRIBGRP") desc = this.getView().getModel("ddtext").getData()["SIZEGRP"];
                    else desc = oColumn.ColumnLabel;
                }
                else if (sTabId === "processTab") {
                    if (oColumn.ColumnName === "ATTRIBCD") desc = this.getView().getModel("ddtext").getData()["ATTRIBUTE"];
                    else desc = oColumn.ColumnLabel;
                } else if (sTabId === "IODETTab") {
                    // if (oColumn.ColumnName === "SALDOCNO") {
                    //     console.log("SALDOCNO");
                    //     console.log(this.getView().getModel("ddtext").getData()["SALDOCNO"]);
                    //     desc = this.getView().getModel("ddtext").getData()["SALDOCNO"]; }

                    if (oColumn.ColumnName === "IOITEM") desc = this.getView().getModel("ddtext").getData()["IOITEM"];
                    else if (oColumn.ColumnName === "SALDOCNO") desc = this.getView().getModel("ddtext").getData()["SALDOCNO"];
                    // else if (oColumn.ColumnName === "SALDOCITEM") desc = this.getView().getModel("ddtext").getData()["SALDOCITEM"];
                    else if (oColumn.ColumnName === "CUSTCOLOR") desc = this.getView().getModel("ddtext").getData()["CUSTCOLOR"];
                    // else if (oColumn.ColumnName === "UNITPRICE1") desc = this.getView().getModel("ddtext").getData()["UNITPRICE1"];
                    // else if (oColumn.ColumnName === "UNITPRICE2") desc = this.getView().getModel("ddtext").getData()["UNITPRICE2"];
                    // else if (oColumn.ColumnName === "UNITPRICE3") desc = this.getView().getModel("ddtext").getData()["UNITPRICE3"];
                    // else if (oColumn.ColumnName === "REVUNITPRICE1") desc = this.getView().getModel("ddtext").getData()["REVUNITPRICE1"];
                    // else if (oColumn.ColumnName === "REVUNITPRICE2") desc = this.getView().getModel("ddtext").getData()["REVUNITPRICE2"];
                    // else if (oColumn.ColumnName === "REVUNITPRICE3") desc = this.getView().getModel("ddtext").getData()["REVUNITPRICE3"];
                    // else if (oColumn.ColumnName === "CUSTSIZE") desc = this.getView().getModel("ddtext").getData()["CUSTSIZE"];
                    // else if (oColumn.ColumnName === "REVORDERQTY") desc = this.getView().getModel("ddtext").getData()["REVORDERQTY"];
                    // else if (oColumn.ColumnName === "ORDERQTY") desc = this.getView().getModel("ddtext").getData()["ORDERQTY"];
                    // else if (oColumn.ColumnName === "ACTUALQTY") desc = this.getView().getModel("ddtext").getData()["ACTUALQTY"];
                    // else if (oColumn.ColumnName === "PLANSHPQTY") desc = this.getView().getModel("ddtext").getData()["PLANSHPQTY"];
                    // else if (oColumn.ColumnName === "SHIPQTY") desc = this.getView().getModel("ddtext").getData()["SHIPQTY"];
                    // else if (oColumn.ColumnName === "MATNO") desc = this.getView().getModel("ddtext").getData()["MATNO"];
                    // else if (oColumn.ColumnName === "BATCH") desc = this.getView().getModel("ddtext").getData()["BATCH"];
                    // else if (oColumn.ColumnName === "REVDLVDT") desc = this.getView().getModel("ddtext").getData()["REVDLVDT"];
                    // else if (oColumn.ColumnName === "CUSTDEST") desc = this.getView().getModel("ddtext").getData()["CUSTDEST"];
                    // else if (oColumn.ColumnName === "DLVSEQ") desc = this.getView().getModel("ddtext").getData()["DLVSEQ"];
                    // else if (oColumn.ColumnName === "DELETED") desc = this.getView().getModel("ddtext").getData()["DELETED"];
                    // else if (oColumn.ColumnName === "REMARKS") desc = this.getView().getModel("ddtext").getData()["REMARKS"];
                    // else if (oColumn.ColumnName === "CREATEDBY") desc = this.getView().getModel("ddtext").getData()["CREATEDBY"];
                    // else if (oColumn.ColumnName === "CREATEDDT") desc = this.getView().getModel("ddtext").getData()["CREATEDDT"];
                    // else if (oColumn.ColumnName === "CREATEDTM") desc = this.getView().getModel("ddtext").getData()["CREATEDTM"];
                    // else if (oColumn.ColumnName === "UPDATEDBY") desc = this.getView().getModel("ddtext").getData()["UPDATEDBY"];
                    // else if (oColumn.ColumnName === "UPDATEDDT") desc = this.getView().getModel("ddtext").getData()["UPDATEDDT"];
                    // else if (oColumn.ColumnName === "UPDATEDTM") desc = this.getView().getModel("ddtext").getData()["UPDATEDTM"];
                    desc = oColumn.ColumnLabel;
                    // console.log("IODETTab Column Desc");
                    // console.log(oColumn);
                    // if (oColumn.ColumnName === "ATTRIBCD") desc = this.getView().getModel("ddtext").getData()["ATTRIBUTE"];
                    // else desc = oColumn.ColumnLabel;
                }
                else desc = oColumn.ColumnLabel;

                return desc;
            },

            styleColumnTemplate: function (type, column) {
                //set the column template based on gynamic fields
                var columnName = column.ColumnName;
                var oColumnTemplate;

                oColumnTemplate = new sap.m.Text({ text: "{DataModel>" + columnName + "}", wrapping: true, tooltip: "{DataModel>" + columnName + "}" });
                return oColumnTemplate;
            },

            async onEdit(arg) {
                // alert(arg);
                if (arg === "color") this._bColorChanged = false;
                else if (arg === "process") this._bProcessChanged = false;
                else if (arg === "ioMatList") this._bIOMatListChanged = false;
                else if (arg === "IODLV") this._bIODLVChanged = false;
                else if (arg === "IODET") this._bIODETChanged = false;
                else if (arg === "IOATTRIB") this._bIOATTRIBChanged = false;
                else if (arg === "costHdr") this._bCostHdrChanged = false;
                else if (arg === "costDtls") this._bCostDtlsChanged = false;

                // this.getView().getModel("ui2").setProperty("/CustDlvDt", sap.ui.getCore().byId("CUSTDLVDT").getValue());
                // console.log("on Edit Check if has Entries");
                // console.log(this.byId(arg + "Tab").getModel());
                // return;

                // console.log("on Edit - " + arg + "Tab");
                // console.log(this.byId(arg + "Tab").getModel());
                // console.log(this.byId(arg + "Tab").getModel().getData());

                // if(this.byId(arg + "Tab").getModel().getData() === null)
                // {
                //     MessageBox.information("No GetData retrieved");
                //     return;
                // }

                await this.lock(this);

                if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {

                    if (arg === "IODET") {
                        // this.byId("idIconTabBarInlineIODET").
                        if (this.byId(arg + "Tab").getModel("DataModel").getData().results.length === 0) {
                            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_EDIT"]);
                            return;
                        }

                        // console.log(this.byId(arg + "Tab").getModel("DataModel").getData());
                        // console.log("Entered Edit Mode");

                        this.byId("btnNewDlvSched").setVisible(false);
                        this.byId("btnImportPODlvSched").setVisible(false);
                        this.byId("btnEditDlvSched").setVisible(false);
                        this.byId("btnDeleteDlvSched").setVisible(false);
                        this.byId("btnCopyDlvSched").setVisible(false);
                        this.byId("btnRefreshDlvSched").setVisible(false);
                        this.byId("btnGenMatList").setVisible(false);
                        this.byId("btnSaveDlvSched").setVisible(false);
                        this.byId("btnCancelDlvSched").setVisible(false);
                        this.byId("btnFullScreenDlvSched").setVisible(false);

                        this.byId("btnNewIODet").setVisible(false);
                        this.byId("btnEditIODet").setVisible(false);
                        // this.byId("btnDeleteIODet").setVisible(false);
                        // this.byId("btnCopyIODet").setVisible(false);
                        this.byId("btnRefreshIODet").setVisible(false);
                        this.byId("btnSaveIODet").setVisible(true);
                        this.byId("btnCancelIODet").setVisible(true);
                        this.byId("btnFullScreenIODet").setVisible(false);

                        this._aDataBeforeChange = jQuery.extend(true, [], this.byId(arg + "Tab").getModel("DataModel").getData().results);
                        // console.log(this._aDataBeforeChange);
                        this.setRowEditMode(arg);
                        this._validationErrors = [];
                        this._sTableModel = arg;
                        this._dataMode = "EDIT";

                        var oIconTabBar = this.byId("idIconTabBarInlineMode");
                        oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                            .forEach(item => item.setProperty("enabled", false));
                    }
                    else if (arg === "costHdr" || arg === "costDtls") {
                        if (this.byId(arg + "Tab").getModel().getData().rows.length === 0) {
                            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_EDIT"]);
                        }
                        else {
                            if (arg === "costHdr") {
                                if (this.byId(arg + "Tab").getModel().getData().rows.filter(fi => fi.COSTSTATUS !== "REL").length === 0) {
                                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_STATUS_ALREADY_REL"]);
                                }
                                else {
                                    this.byId("btnNewCostHdr").setVisible(false);
                                    this.byId("btnEditCostHdr").setVisible(false);
                                    this.byId("btnRefreshCostHdr").setVisible(false);
                                    this.byId("btnSaveCostHdr").setVisible(true);
                                    this.byId("btnCancelCostHdr").setVisible(true);

                                    this.byId("btnEditCostDtl").setEnabled(false);
                                    this.byId("btnPrintCosting").setEnabled(false);
                                    this.byId("btnReleaseCosting").setEnabled(false);
                                    this.byId("btnRefreshCostDtl").setEnabled(false);

                                    this.getColumnFilterSorter(arg);
                                    this._aDataBeforeChange = jQuery.extend(true, [], this.byId(arg + "Tab").getModel().getData().rows);
                                    this.setRowEditMode(arg);
                                    this._validationErrors = [];
                                    this._sTableModel = arg;
                                    this._dataMode = "EDIT";

                                    var oIconTabBar = this.byId("idIconTabBarInlineMode");
                                    oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                                        .forEach(item => item.setProperty("enabled", false));
                                }
                            }
                            else {
                                var vType = this.byId(arg + "Tab").getModel().getData().rows[0].CSTYPE;
                                var vVersion = this.byId(arg + "Tab").getModel().getData().rows[0].VERSION;
                                var vStatus = this.byId("costHdrTab").getModel().getData().rows.filter(fi => fi.CSTYPE === vType && fi.VERSION === vVersion)[0].COSTSTATUS;

                                if (vStatus === "REL") {
                                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_STATUS_ALREADY_REL"]);
                                }
                                else {
                                    this.byId("btnEditCostDtl").setVisible(false);
                                    this.byId("btnPrintCosting").setVisible(false);
                                    this.byId("btnReleaseCosting").setVisible(false);
                                    this.byId("btnRefreshCostDtl").setVisible(false);
                                    this.byId("btnSaveCostDtl").setVisible(true);
                                    this.byId("btnCancelCostDtl").setVisible(true);

                                    this.byId("btnNewCostHdr").setEnabled(false);
                                    this.byId("btnEditCostHdr").setEnabled(false);
                                    this.byId("btnRefreshCostHdr").setEnabled(false);

                                    this.getColumnFilterSorter(arg);
                                    this._aDataBeforeChange = jQuery.extend(true, [], this.byId(arg + "Tab").getModel().getData().rows);
                                    this.setRowEditMode(arg);
                                    this._validationErrors = [];
                                    this._sTableModel = arg;
                                    this._dataMode = "EDIT";

                                    var oIconTabBar = this.byId("idIconTabBarInlineMode");
                                    oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                                        .forEach(item => item.setProperty("enabled", false));
                                }
                            }
                        }
                    }
                    else {
                        if (this.byId(arg + "Tab").getModel().getData().rows.length === 0) {
                            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_EDIT"]);
                        }
                        else {
                            if (arg === "color") {
                                this.byId("btnEditColor").setVisible(false);
                                this.byId("btnSaveColor").setVisible(true);
                                this.byId("btnCancelColor").setVisible(true);
                                this.byId("btnRefreshColor").setVisible(false);
                                this.getColumnFilterSorter(arg);
                            }
                            else if (arg === "process") {
                                this.byId("btnEditProcess").setVisible(false);
                                this.byId("btnSaveProcess").setVisible(true);
                                this.byId("btnCancelProcess").setVisible(true);
                                this.byId("btnRefreshProcess").setVisible(false);
                                this.getColumnFilterSorter(arg);
                            }
                            else if (arg === "ioMatList") {
                                this.byId("btnSubmitMRP").setVisible(false);
                                this.byId("btnAssignMatNo").setVisible(false);
                                this.byId("btnEditIOMatList").setVisible(false);
                                this.byId("btnRefreshIOMatList").setVisible(false);
                                this.byId("btnExportIOMatList").setVisible(false);
                                this.byId("btnSaveIOMatList").setVisible(true);
                                this.byId("btnCancelIOMatList").setVisible(true);
                                this.byId("btnReorderIOMatList").setVisible(false);
                                this.byId("btnDeleteIOMatList").setVisible(false);
                                this.byId("btnTabLayoutIOMatList").setVisible(false);
                                this.getColumnFilterSorter(arg);
                            } else if (arg === "IODLV") {
                                this.byId("btnNewDlvSched").setVisible(false);
                                this.byId("btnImportPODlvSched").setVisible(false);
                                this.byId("btnEditDlvSched").setVisible(false);
                                this.byId("btnDeleteDlvSched").setVisible(false);
                                this.byId("btnCopyDlvSched").setVisible(false);
                                this.byId("btnRefreshDlvSched").setVisible(false);
                                this.byId("btnGenMatList").setVisible(false);
                                this.byId("btnSaveDlvSched").setVisible(true);
                                this.byId("btnCancelDlvSched").setVisible(true);
                                this.byId("btnFullScreenDlvSched").setVisible(false);

                                this.byId("btnNewIODet").setVisible(false);
                                this.byId("btnEditIODet").setVisible(false);
                                // this.byId("btnDeleteIODet").setVisible(false);
                                // this.byId("btnCopyIODet").setVisible(false);
                                this.byId("btnRefreshIODet").setVisible(false);
                                this.byId("btnSaveIODet").setVisible(false);
                                this.byId("btnCancelIODet").setVisible(false);
                                this.byId("btnFullScreenIODet").setVisible(false);
                            }
                            // else if (arg === "IODET") {
                            //     this.byId("btnNewDlvSched").setVisible(false);
                            //     this.byId("btnImportPODlvSched").setVisible(false);
                            //     this.byId("btnEditDlvSched").setVisible(false);
                            //     this.byId("btnDeleteDlvSched").setVisible(false);
                            //     this.byId("btnCopyDlvSched").setVisible(false);
                            //     this.byId("btnRefreshDlvSched").setVisible(false);
                            //     this.byId("btnSaveDlvSched").setVisible(false);
                            //     this.byId("btnCancelDlvSched").setVisible(false);
                            //     this.byId("btnFullScreenDlvSched").setVisible(false);

                            //     this.byId("btnNewIODet").setVisible(false);
                            //     this.byId("btnEditIODet").setVisible(false);
                            //     this.byId("btnDeleteIODet").setVisible(false);
                            //     // this.byId("btnCopyIODet").setVisible(false);
                            //     this.byId("btnRefreshIODet").setVisible(false);
                            //     this.byId("btnSaveIODet").setVisible(true);
                            //     this.byId("btnCancelIODet").setVisible(true);
                            //     this.byId("btnFullScreenIODet").setVisible(false);
                            // } 
                            else if (arg === "IOATTRIB") {
                                this.byId("onIOAttribEdit").setVisible(false);
                                this.byId("onIOAttribSave").setVisible(true);
                                this.byId("onIOAttribCancel").setVisible(true);

                                this.byId("onIOEdit").setVisible(false);
                                this.byId("onIORelease").setVisible(false);
                            }
                            else if (arg === "costHdr") {
                                this.byId("btnNewCostHdr").setVisible(false);
                                this.byId("btnEditCostHdr").setVisible(false);
                                this.byId("btnRefreshCostHdr").setVisible(false);
                                this.byId("btnSaveCostHdr").setVisible(true);
                                this.byId("btnCancelCostHdr").setVisible(true);

                                this.byId("btnEditCostDtl").setEnabled(false);
                                this.byId("btnPrintCosting").setEnabled(false);
                                this.byId("btnReleaseCosting").setEnabled(false);
                                this.byId("btnRefreshCostDtl").setEnabled(false);
                            }
                            else if (arg === "costDtls") {
                                this.byId("btnEditCostDtl").setVisible(false);
                                this.byId("btnPrintCosting").setVisible(false);
                                this.byId("btnReleaseCosting").setVisible(false);
                                this.byId("btnRefreshCostDtl").setVisible(false);
                                this.byId("btnSaveCostDtl").setVisible(true);
                                this.byId("btnCancelCostDtl").setVisible(true);

                                this.byId("btnNewCostHdr").setEnabled(false);
                                this.byId("btnEditCostHdr").setEnabled(false);
                                this.byId("btnRefreshCostHdr").setEnabled(false);
                            }

                            this._aDataBeforeChange = jQuery.extend(true, [], this.byId(arg + "Tab").getModel().getData().rows);
                            this.setRowEditMode(arg);
                            this._validationErrors = [];
                            this._sTableModel = arg;
                            this._dataMode = "EDIT";

                            if (arg !== "IODET")
                                this.setActiveRowHighlightByTableId(arg + "Tab");

                            var oIconTabBar = this.byId("idIconTabBarInlineMode");
                            oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                                .forEach(item => item.setProperty("enabled", false));

                            if (arg === "IOATTRIB" || arg === "IOSTATUS") {
                                var oIconTabBarStyle = this.byId("idIconTabBarInlineIOHdr");
                                oIconTabBarStyle.getItems().filter(item => item.getProperty("key") !== oIconTabBarStyle.getSelectedKey())
                                    .forEach(item => item.setProperty("enabled", false));
                            }

                            if (arg === "color" || arg === "process") {
                                var oIconTabBarStyle = this.byId("itbStyleDetail");
                                oIconTabBarStyle.getItems().filter(item => item.getProperty("key") !== oIconTabBarStyle.getSelectedKey())
                                    .forEach(item => item.setProperty("enabled", false));
                            }

                            // if (arg === "IODLV" || arg === "IODET") {
                            //     var oIconTabBarStyle = this.byId("idIconTabBarInlineIOHdr");
                            //     oIconTabBarStyle.getItems().filter(item => item.getProperty("key") !== oIconTabBarStyle.getSelectedKey())
                            //         .forEach(item => item.setProperty("enabled", false));
                            // }

                            if (arg === "IOATTRIB") {
                                var oIconTabBarStyle = this.byId("itfIOATTRIB");
                                oIconTabBarStyle.getItems().filter(item => item.getProperty("key") !== oIconTabBarStyle.getSelectedKey())
                                    .forEach(item => item.setProperty("enabled", false));
                            }
                        }
                    }
                }
            },

            onCancel: async function (arg) {
                var bChanged = false;

                if (arg === "color") bChanged = this._bColorChanged;
                else if (arg === "process") bChanged = this._bProcessChanged;
                else if (arg === "ioMatList") bChanged = this._bIOMatListChanged;
                else if (arg === "IODLV") bChanged = this._bIODVLChanged;
                else if (arg === "IODET") bChanged = this._bIODETChanged;
                else if (arg === "costHdr") bChanged = this._bCostHdrChanged;
                else if (arg === "costDtls") bChanged = this._bCostDtlsChanged;
                else if (arg === "IOATTRIB") bChanged = this._bIOATTRIBChanged;

                if (bChanged) {
                    var oData = {
                        Action: "update-cancel",
                        Text: this.getView().getModel("ddtext").getData()["CONFIRM_DISREGARD_CHANGE"]
                    }

                    var oJSONModel = new JSONModel();
                    oJSONModel.setData(oData);

                    if (!this._ConfirmDialog) {
                        this._ConfirmDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.ConfirmDialog", this);

                        this._ConfirmDialog.setModel(oJSONModel);
                        this.getView().addDependent(this._ConfirmDialog);
                    }
                    else this._ConfirmDialog.setModel(oJSONModel);

                    this._ConfirmDialog.open();
                }
                else {
                    Common.openLoadingDialog(this);

                    if (arg === "color") {
                        this.byId("btnEditColor").setVisible(true);
                        this.byId("btnSaveColor").setVisible(false);
                        this.byId("btnCancelColor").setVisible(false);
                        this.byId("btnRefreshColor").setVisible(true);
                    }
                    else if (arg === "process") {
                        this.byId("btnEditProcess").setVisible(true);
                        this.byId("btnSaveProcess").setVisible(false);
                        this.byId("btnCancelProcess").setVisible(false);
                        this.byId("btnRefreshProcess").setVisible(true);
                    }
                    else if (arg === "ioMatList") {
                        this.byId("btnSubmitMRP").setVisible(true);
                        this.byId("btnAssignMatNo").setVisible(true);
                        this.byId("btnEditIOMatList").setVisible(true);
                        this.byId("btnRefreshIOMatList").setVisible(true);
                        this.byId("btnExportIOMatList").setVisible(true);
                        this.byId("btnSaveIOMatList").setVisible(false);
                        this.byId("btnCancelIOMatList").setVisible(false);
                        this.byId("btnReorderIOMatList").setVisible(true);
                        this.byId("btnDeleteIOMatList").setVisible(true);
                        this.byId("btnTabLayoutIOMatList").setVisible(true);
                    } else if (arg === "IODLV") {
                        this.byId("btnNewDlvSched").setVisible(true);
                        this.byId("btnImportPODlvSched").setVisible(true);
                        this.byId("btnEditDlvSched").setVisible(true);
                        this.byId("btnDeleteDlvSched").setVisible(true);
                        this.byId("btnCopyDlvSched").setVisible(true);
                        this.byId("btnRefreshDlvSched").setVisible(true);
                        this.byId("btnGenMatList").setVisible(true);
                        this.byId("btnSaveDlvSched").setVisible(false);
                        this.byId("btnCancelDlvSched").setVisible(false);
                        this.byId("btnFullScreenDlvSched").setVisible(true);

                        this.byId("btnNewIODet").setVisible(true);
                        this.byId("btnEditIODet").setVisible(true);
                        // this.byId("btnDeleteIODet").setVisible(true);
                        // this.byId("btnCopyIODet").setVisible(true);
                        this.byId("btnRefreshIODet").setVisible(true);
                        this.byId("btnSaveIODet").setVisible(false);
                        this.byId("btnCancelIODet").setVisible(false);
                        this.byId("btnFullScreenIODet").setVisible(true);
                    } else if (arg === "IODET") {
                        this.byId("btnNewDlvSched").setVisible(true);
                        this.byId("btnImportPODlvSched").setVisible(true);
                        this.byId("btnEditDlvSched").setVisible(true);
                        this.byId("btnDeleteDlvSched").setVisible(true);
                        this.byId("btnCopyDlvSched").setVisible(true);
                        this.byId("btnRefreshDlvSched").setVisible(true);
                        this.byId("btnGenMatList").setVisible(true);
                        this.byId("btnSaveDlvSched").setVisible(false);
                        this.byId("btnCancelDlvSched").setVisible(false);
                        this.byId("btnFullScreenDlvSched").setVisible(true);

                        this.byId("btnNewIODet").setVisible(true);
                        this.byId("btnEditIODet").setVisible(true);
                        // this.byId("btnDeleteIODet").setVisible(true);
                        // this.byId("btnCopyIODet").setVisible(true);
                        this.byId("btnRefreshIODet").setVisible(true);
                        this.byId("btnSaveIODet").setVisible(false);
                        this.byId("btnCancelIODet").setVisible(false);
                        this.byId("btnFullScreenIODet").setVisible(true);
                    } else if (arg === "IOATTRIB") {
                        this.byId("onIOAttribEdit").setVisible(true);
                        this.byId("onIOAttribSave").setVisible(false);
                        this.byId("onIOAttribCancel").setVisible(false);

                        this.byId("onIOEdit").setVisible(true);
                        this.byId("onIORelease").setVisible(true);
                    }
                    else if (arg === "costHdr") {
                        this.byId("btnNewCostHdr").setVisible(true);
                        this.byId("btnEditCostHdr").setVisible(true);
                        this.byId("btnRefreshCostHdr").setVisible(true);
                        this.byId("btnSaveCostHdr").setVisible(false);
                        this.byId("btnCancelCostHdr").setVisible(false);

                        this.byId("btnEditCostDtl").setEnabled(true);
                        this.byId("btnPrintCosting").setEnabled(true);
                        this.byId("btnReleaseCosting").setEnabled(true);
                        this.byId("btnRefreshCostDtl").setEnabled(true);
                    }
                    else if (arg === "costDtls") {
                        this.byId("btnEditCostDtl").setVisible(true);
                        this.byId("btnPrintCosting").setVisible(true);
                        this.byId("btnReleaseCosting").setVisible(true);
                        this.byId("btnRefreshCostDtl").setVisible(true);
                        this.byId("btnSaveCostDtl").setVisible(false);
                        this.byId("btnCancelCostDtl").setVisible(false);

                        this.byId("btnNewCostHdr").setEnabled(true);
                        this.byId("btnEditCostHdr").setEnabled(true);
                        this.byId("btnRefreshCostHdr").setEnabled(true);
                    }

                    this.setRowReadMode(arg);
                    this.unLock();
                    if (arg === "IODET") {
                        // console.log("IO DETAIL aDataBeforeChange");
                        // console.log(this._aDataBeforeChange);
                        // console.log(this.byId(arg + "Tab").getModel("DataModel"));
                        // this.byId(arg + "Tab").getModel("DataModel").setProperty("/results", this._aDataBeforeChange);
                        // this.byId(arg + "Tab").bindRows("/results");
                        // console.log(this.byId(arg + "Tab").getModel("DataModel"));
                        await this.reloadIOData("IODETTab", "/IODETSet");
                        this._bIODETChanged = false;
                    }
                    else {
                        this.byId(arg + "Tab").getModel().setProperty("/rows", this._aDataBeforeChange);
                        // console.log("Other Table aDataBeforeChange");
                        // console.log(this.byId(arg + "Tab").getModel());
                        this.byId(arg + "Tab").bindRows("/rows");
                    }
                    this._dataMode = "READ";

                    if (arg !== "IODET")
                        this.setActiveRowHighlightByTableId(arg + "Tab");

                    var oIconTabBar = this.byId("idIconTabBarInlineMode");
                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                    if (arg === "color" || arg === "process") {
                        var oIconTabBarStyle = this.byId("itbStyleDetail");
                        oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));
                    }

                    if (arg === "IODVL" || arg === "IODET") {
                        // var oIconTabBarStyle = this.byId("idIconTabBarInlineIOHdr");
                        // oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));

                        // setTimeout(() => {
                        //     this.reloadIOData("IODETTab", "/IODETSet");
                        // }, 100);

                        // _promiseResult = new Promise((resolve, reject) => {

                        //     this._tblChange = true;
                        //     // setTimeout(() => {
                        //     this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);
                        //     resolve();
                        //     // }, 100);
                        // })
                        // await _promiseResult;
                    }

                    if (arg === "IOATTRIB" || arg === "IOSTATUS") {
                        var oIconTabBarStyle = this.byId("idIconTabBarInlineIOHdr");
                        oIconTabBarStyle.getItems().filter(item => item.getProperty("key") !== oIconTabBarStyle.getSelectedKey())
                            .forEach(item => item.setProperty("enabled", true));
                    }

                    if (arg === "color" || arg === "process" || arg === "ioMatList" || arg === "costHdr" || arg === "costDtls") {
                        if (this._aColFilters.length > 0) { this.setColumnFilters(arg + "Tab"); }
                        if (this._aColSorters.length > 0) { this.setColumnSorters(arg + "Tab"); }
                    }

                    Common.closeLoadingDialog(this);
                }
            },

            async onTagAsDeleted(arg) {
                var me = this;
                var oFunction = {};
                var oCondition = "", vCondition = "";
                var bProceed = true;
                var oTable = this.byId(arg + "Tab");
                var oTmpSelectedIndices = [];
                var aSelectedData = [];
                var oSelectedIndices = oTable.getSelectedIndices();
                var aData = oTable.getModel().getData().rows;

                if (oSelectedIndices.length > 0) {
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    oSelectedIndices = oTmpSelectedIndices;

                    oSelectedIndices.forEach((item, index) => {
                        if (!aData.at(item).DELETED) {
                            aSelectedData.push(aData.at(item));
                        }
                    })
                }
                else {
                    bProceed = false;
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
                }
                // console.log(aSelectedData);
                if (bProceed) {
                    if (aSelectedData.length === 0) {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_SEL_RECORD_ALREADY_DELETED"]);
                    }
                    else {
                        await this.lock(this);
                        if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {
                            if (arg === "ioMatList") {
                                if (this._aFunction[arg + "Tab"] !== undefined) {
                                    oFunction = this._aFunction[arg + "Tab"].filter(fItem => fItem.NAME === "DELETE");

                                    if (oFunction.length > 0) {
                                        oCondition = oFunction[0].VALUE;
                                    }
                                }

                                // oCondition = "23";
                                var aParam = [];
                                var sValidated = "", sValidated2 = "", sValidated3 = "", sValidated4 = "";
                                var sDeleted = "";

                                if (oCondition === "5") {
                                    bProceed = false;
                                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_DELETE_NOT_ALLOW"]);
                                }
                                else {
                                    if (oCondition === "" || oCondition === "1") {
                                        aParam = aSelectedData;
                                    }
                                    else {
                                        var bToDelete = true;

                                        aSelectedData.forEach(item => {
                                            if (oCondition.indexOf("2") >= 0 && (+item.MRPQTY > 0 || +item.PRQTY > 0 || +item.POQTY > 0)) {
                                                if (sValidated2.length === 0) { sValidated2 = this.getView().getModel("ddtext").getData()["INFO_NO_DELETE_PENDINGDOC"] + ": \r\n"; }
                                                sValidated2 = sValidated2 + item.SEQNO + "/" + item.MATNO + "\r\n";
                                                bToDelete = false;
                                            }
                                            else if (oCondition.indexOf("3") >= 0 && (+item.PLANTAVAILQTY > 0)) {
                                                if (sValidated3.length === 0) { sValidated3 = this.getView().getModel("ddtext").getData()["INFO_NO_DELETE_PLANTAVAIL"] + ": \r\n"; }
                                                sValidated3 = sValidated3 + item.SEQNO + "/" + item.MATNO + "\r\n";
                                                bToDelete = false;
                                            }
                                            else if (oCondition.indexOf("4") >= 0 && (+item.ISSTOPROD > 0)) {
                                                if (sValidated4.length === 0) { sValidated4 = this.getView().getModel("ddtext").getData()["INFO_NO_DELETE_ISSTOPROD"] + ": \r\n"; }
                                                sValidated4 = sValidated4 + item.SEQNO + "/" + item.MATNO + "\r\n";
                                                bToDelete = false;
                                            }

                                            if (bToDelete) {
                                                aParam.push(item);
                                                if (sDeleted.length === 0) { sDeleted = this.getView().getModel("ddtext").getData()["INFO_FF_REC_DELETED"] + ": \r\n"; }
                                                sDeleted = sDeleted + item.SEQNO + "/" + item.MATNO + "\r\n";
                                            }
                                        })

                                        sValidated = this.getView().getModel("ddtext").getData()["INFO_FF_REC_CANNOT_DELETE"] + "\r\n" + sValidated2 + sValidated3 + sValidated4;
                                    }

                                    if (aParam.length > 0) {
                                        var entitySet = "/MainSet";

                                        this._oModelIOMatList.setHeaders({ UPDTYP: "DELETE" });
                                        this._oModelIOMatList.setUseBatch(true);
                                        this._oModelIOMatList.setDeferredGroups(["update"]);

                                        var mParameters = {
                                            "groupId": "update"
                                        }

                                        var centitySet = entitySet;

                                        Common.openProcessingDialog(me, "Processing...");

                                        aParam.forEach(item => {
                                            entitySet = centitySet + "(";
                                            var param = {};
                                            var iKeyCount = this._aColumns[arg].filter(col => col.Key === "X").length;
                                            // console.log(this._aColumns[arg])
                                            this._aColumns[arg].forEach(col => {
                                                if (iKeyCount === 1) {
                                                    if (col.Key === "X") {
                                                        entitySet += "'" + item[col.ColumnName] + "'"
                                                        param[col.ColumnName] = item[col.ColumnName];
                                                    }
                                                }
                                                else if (iKeyCount > 1) {
                                                    if (col.Key === "X") {
                                                        entitySet += col.ColumnName + "='" + item[col.ColumnName] + "',"
                                                        param[col.ColumnName] = item[col.ColumnName];
                                                    }
                                                }
                                            })

                                            if (iKeyCount > 1) entitySet = entitySet.substring(0, entitySet.length - 1);
                                            entitySet += ")";

                                            // console.log(entitySet);
                                            // console.log(param);
                                            this._oModelIOMatList.update(entitySet, param, mParameters);
                                        })

                                        this._oModelIOMatList.submitChanges({
                                            groupId: "update",
                                            success: function (oData, oResponse) {
                                                if (aParam.length === aSelectedData.length) {
                                                    MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_SEL_RECORD_DELETED"]);
                                                }
                                                else {
                                                    MessageBox.information(sDeleted + "\r\n" + sValidated);
                                                }

                                                Common.closeProcessingDialog(me);
                                                me.onRefresh("ioMatList");
                                            },
                                            error: function () {
                                                Common.closeProcessingDialog(me);
                                            }
                                        })
                                    }
                                    else {
                                        MessageBox.information(sValidated);
                                    }
                                }
                            }
                            else if (arg === "size") {
                                var entitySet = "/AttribSet";

                                this._oModelStyle.setHeaders({ UPDTYP: "DELETE" });
                                this._oModelStyle.setUseBatch(true);
                                this._oModelStyle.setDeferredGroups(["update"]);

                                var mParameters = {
                                    "groupId": "update"
                                }

                                var centitySet = entitySet;
                                // console.log("delete")
                                Common.openProcessingDialog(me, "Processing...");

                                aSelectedData.forEach(item => {
                                    entitySet = centitySet + "(";
                                    var param = {};
                                    var iKeyCount = this._aColumns[arg].filter(col => col.Key === "X").length;
                                    // console.log(this._aColumns[arg])
                                    this._aColumns[arg].forEach(col => {
                                        if (iKeyCount === 1) {
                                            if (col.Key === "X") {
                                                entitySet += "'" + item[col.ColumnName] + "'"
                                                param[col.ColumnName] = item[col.ColumnName];
                                            }
                                        }
                                        else if (iKeyCount > 1) {
                                            if (col.Key === "X") {
                                                entitySet += col.ColumnName + "='" + item[col.ColumnName] + "',"
                                                param[col.ColumnName] = item[col.ColumnName];
                                            }
                                        }
                                    })

                                    if (iKeyCount > 1) entitySet = entitySet.substring(0, entitySet.length - 1);
                                    entitySet += ")";

                                    this._oModelStyle.update(entitySet, param, mParameters);
                                })

                                this._oModelStyle.submitChanges({
                                    groupId: "update",
                                    success: function (oData, oResponse) {
                                        // if (aParam.length === aSelectedData.length) {
                                        //     MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_SEL_RECORD_DELETED"]);
                                        // }
                                        // else {
                                        //     MessageBox.information(sDeleted + "\r\n" + sValidated);
                                        // }
                                        // console.log(oResponse);
                                        var sMessage = "";
                                        var wError = false, bDeleted = false;;

                                        oResponse.data.__batchResponses[0].__changeResponses.forEach(resp => {
                                            var oMessage = JSON.parse(resp.headers["sap-message"]);

                                            if (oMessage.severity === "error") {
                                                wError = true;
                                            }
                                            else {
                                                bDeleted = true;
                                            }

                                            sMessage = sMessage + oMessage.message + "\r\n";
                                        })

                                        if (wError) {
                                            MessageBox.information(sMessage);
                                        }
                                        else {
                                            MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_SEL_RECORD_DELETED"]);
                                        }

                                        Common.closeProcessingDialog(me);
                                        if (bDeleted) {
                                            me.onRefresh("size");
                                            me.getIOSizes();
                                        }
                                    },
                                    error: function () {
                                        Common.closeProcessingDialog(me);
                                    }
                                })
                            }
                            this.unLock();
                        } else
                            MessageBox.error(this.getView().getModel("ui").getProperty("/LockMessage"));
                    }
                }
            },

            async onUndelete(arg) {
                var me = this;
                var oFunction = {};
                var oCondition = "", vCondition = "";
                var bProceed = true;
                var oTable = this.byId(arg + "Tab");
                var oTmpSelectedIndices = [];
                var aSelectedData = [];
                var oSelectedIndices = oTable.getSelectedIndices();
                var aData = oTable.getModel().getData().rows;

                if (oSelectedIndices.length > 0) {
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    oSelectedIndices = oTmpSelectedIndices;

                    oSelectedIndices.forEach((item, index) => {
                        if (aData.at(item).DELETED) {
                            aSelectedData.push(aData.at(item));
                        }
                    })
                }
                else {
                    bProceed = false;
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
                }
                // console.log(aSelectedData);
                if (bProceed) {
                    if (aSelectedData.length === 0) {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_SEL_RECORD_NOT_DELETED"]);
                    }
                    else {

                        await this.lock(this);
                        if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {
                            if (arg === "size") {
                                var entitySet = "/AttribSet";

                                this._oModelStyle.setHeaders({ UPDTYP: "UNDELETE" });
                                this._oModelStyle.setUseBatch(true);
                                this._oModelStyle.setDeferredGroups(["update"]);

                                var mParameters = {
                                    "groupId": "update"
                                }

                                var centitySet = entitySet;

                                Common.openProcessingDialog(me, "Processing...");

                                aSelectedData.forEach(item => {
                                    entitySet = centitySet + "(";
                                    var param = {};
                                    var iKeyCount = this._aColumns[arg].filter(col => col.Key === "X").length;
                                    // console.log(this._aColumns[arg])
                                    this._aColumns[arg].forEach(col => {
                                        if (iKeyCount === 1) {
                                            if (col.Key === "X") {
                                                entitySet += "'" + item[col.ColumnName] + "'"
                                                param[col.ColumnName] = item[col.ColumnName];
                                            }
                                        }
                                        else if (iKeyCount > 1) {
                                            if (col.Key === "X") {
                                                entitySet += col.ColumnName + "='" + item[col.ColumnName] + "',"
                                                param[col.ColumnName] = item[col.ColumnName];
                                            }
                                        }
                                    })

                                    if (iKeyCount > 1) entitySet = entitySet.substring(0, entitySet.length - 1);
                                    entitySet += ")";

                                    this._oModelStyle.update(entitySet, param, mParameters);
                                })

                                this._oModelStyle.submitChanges({
                                    groupId: "update",
                                    success: function (oData, oResponse) {
                                        MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_SEL_RECORD_UNDELETED"]);

                                        Common.closeProcessingDialog(me);
                                        me.onRefresh("size");
                                        me.getIOSizes();
                                    },
                                    error: function () {
                                        Common.closeProcessingDialog(me);
                                    }
                                })
                            }
                            this.unLock();
                        } else
                            MessageBox.error(this.getView().getModel("ui").getProperty("/LockMessage"));
                    }
                }
            },

            UpdateIOHdrQuantity: async function () {
                var me = this;
                // console.log("UpdateIOHdrQuantity ");
                var oModel = this.getOwnerComponent().getModel();
                let pIONO = this.getView().getModel("ui2").getProperty("/currIONo");

                var oParam = {
                    "Iono": pIONO
                };

                // console.log(oParam);

                await new Promise((resolve, reject) => {
                    // oModel.create("/ORDERQTYSET", oParam, {
                    // method: "POST",
                    oModel.update("/IOHDRQTYUPDSet(Iono='" + pIONO + "')", oParam, {
                        method: "PUT",
                        success: function (oData, oResponse) {
                            // console.log("UpdateIOHdrQuantity Success");
                            // console.log(oResponse);
                            resolve();
                            // await me.refreshHeaderData();
                        },
                        error: function (err) {
                            // console.log("UpdateIOHdrQuantity Error");
                            // console.log(err);
                            resolve();
                        }
                    });
                });
            },

            onSaveIODET: async function () {
                var me = this;
                var arg = "IODET";
                var aNewRows = this.byId("IODETTab").getModel("DataModel").getData().results.filter(item => item.New === true);
                var iNew = 0;
                var aEditedRows = this.byId("IODETTab").getModel("DataModel").getData().results.filter(item => item.EDITED === true && item.New !== true);
                var iEdited = 0;
                var cDlvSeq = this.getView().getModel("ui2").getProperty("/currDlvSeq");
                var hasMatchingSize = false;

                // console.log("aNewRows");
                // console.log(aNewRows);
                // console.log("aEditedRows");
                // console.log(aEditedRows);
                // console.log("this._validationErrors");
                // console.log(this._validationErrors);

                // console.log(this._validationErrors.length);
                if (this._validationErrors.length === 0) {

                    Common.openProcessingDialog(me, "Processing...");
                    // await me.lock(me);
                    // if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {
                    //PROCESS NEW ROW DATA
                    if (aNewRows.length > 0) {
                        if (this._validationErrors.length === 0) {
                            var entitySet = "/";
                            var oModel;

                            switch (arg) {
                                case "IODET":
                                    entitySet = entitySet + "IODETSet"
                                    oModel = me.getOwnerComponent().getModel();
                                    break;
                                default: break;
                            }

                            oModel.setUseBatch(true);
                            oModel.setDeferredGroups(["insert"]);

                            var mParameters = {
                                "groupId": "insert"
                            };

                            //APPLY SIZE DATAMODEL UNPIVOT

                            var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");

                            // console.log("aNewRows");
                            // console.log(aNewRows);
                            if (aNewRows[0]["CUSTCOLOR"] === undefined) {
                                MessageBox.information("Customer Color is required.");
                                Common.closeProcessingDialog(me);
                                return;
                            }

                            //LOOP THRU NEW ROWS (CURRENTLY ONE ROW IMPLEM)
                            aNewRows.forEach(async item => {
                                //LOOP THRU COLLECTION OF SIZES FOR THE IO
                                this._iosizes.forEach(async colSizes => {
                                    hasMatchingSize = false;
                                    var param = {};
                                    // param["IONO"] = me._ioNo;
                                    param["IONO"] = cIONo;
                                    param["DLVSEQ"] = JSON.stringify(cDlvSeq);

                                    //LOOP THRU COLLECTION OF COLUMNS OF THE DATAMODEL
                                    this._aColumns[arg].forEach(col => {
                                        //FILTER COLUMNS: NOT A KEY COLUMN AND COLUMN HAS VALUE
                                        if (col.Key !== "X" && item[col.ColumnName] !== undefined) {
                                            //IF DATETIME DATATYPE: FORMAT VALUE AS VALID ABAP DATETIME FORMAT
                                            if (col.DataType === "DATETIME") {
                                                param[col.ColumnName] = sapDateFormat.format(new Date(item[col.ColumnName])) //+ "T00:00:00" //DlvDt
                                                //IF COLUMN NAME IS EQUAL WITH IOSIZE ATTRIBUTE CODE
                                            } else if (col.ColumnName === colSizes.ATTRIBCD + "REVORDERQTY") {
                                                //SET CUSTSIZE : USE ATTRIBUTE CODE
                                                param["CUSTSIZE"] = colSizes.ATTRIBCD === "" ? "" : colSizes.ATTRIBCD
                                                //SET REVORDERQTY : USE QUANTITY AT SIZE COLUMNS THAT MATCH THE IO SIZE
                                                param["REVORDERQTY"] = item[col.ColumnName] === "" ? "0" : item[col.ColumnName]
                                                //SET hasMatchingSize VARIABLE AS TRUE; THIS IS NEED IF THE SIZE MUST BE REMOVED FROM THE JSON ARRAY
                                                hasMatchingSize = true;
                                            } else if (col.ColumnName === colSizes.ATTRIBCD + "SHIPQTY") {
                                                //SET CUSTSIZE : USE ATTRIBUTE CODE
                                                param["CUSTSIZE"] = colSizes.ATTRIBCD === "" ? "" : colSizes.ATTRIBCD
                                                //SET REVORDERQTY : USE QUANTITY AT SIZE COLUMNS THAT MATCH THE IO SIZE
                                                param["SHIPQTY"] = item[col.ColumnName] === "" ? "0" : item[col.ColumnName]
                                                //SET hasMatchingSize VARIABLE AS TRUE; THIS IS NEED IF THE SIZE MUST BE REMOVED FROM THE JSON ARRAY
                                                hasMatchingSize = true;
                                            } else {
                                                //SET OTHER COLUMNS NOT RELATED TO SIZE AND DATETIME
                                                param[col.ColumnName] = item[col.ColumnName] === "" ? "" : item[col.ColumnName]
                                            }
                                        }
                                    })

                                    //IF SIZE COLUMNS AT MODEL HAS NO MATCHING COLUMNS AT SIZE MODEL
                                    //INSERT CUSTSIZE WITH REVORDERQTY = 0
                                    if (!hasMatchingSize) {
                                        param["CUSTSIZE"] = colSizes.ATTRIBCD;
                                        param["REVORDERQTY"] = "0";
                                        param["SHIPQTY"] = "0";
                                    }

                                    //REMOVE SIZE COLUMNS NOT APPLICABLE FOR UNPIVOT
                                    this._iosizes.forEach(colSizesRemove => {
                                        delete param[colSizesRemove.ATTRIBCD + "REVORDERQTY"];
                                        delete param[colSizesRemove.ATTRIBCD + "SHIPQTY"];
                                        // if (colSizes.ATTRIBCD !== colSizesRemove.ATTRIBCD)
                                        //     delete param[colSizesRemove.ATTRIBCD];
                                    })

                                    // if(param["CUSTCOLOR"] === undefined){
                                    //     MessageBox.information("Customer Color entry is required");
                                    //     return;
                                    // }

                                    // console.log(this._iosizes);
                                    // console.log(entitySet);
                                    // console.log(param);
                                    // console.log(arg);

                                    // return;

                                    //CREATE ENTRIES USING BATCH PROCESSING

                                    // await new Promise((resolve, reject) => {
                                    oModel.create(entitySet, param, mParameters);


                                    // _promiseResult = new Promise((resolve, reject) => {
                                    //     setTimeout(() => {
                                    //         oModel.create(entitySet, param, {
                                    //             method: "POST",
                                    //             success: function (data, oResponse) {
                                    //                 // console.log("Success : " + entitySet);
                                    //                 resolve();
                                    //             },
                                    //             error: function () {
                                    //                 // console.log("Error : " + entitySet);
                                    //                 iNew++;
                                    //                 // alert("Error");
                                    //                 if (iNew === aNewRows.length) Common.closeProcessingDialog(me);
                                    //                 resolve();
                                    //             }
                                    //         })
                                    //     }, 1000);
                                    // });
                                    // await _promiseResult;

                                });

                                // return;
                                // console.log(oModel);
                                // return;
                                await new Promise((resolve, reject) => {
                                    oModel.submitChanges({
                                        // mParameters,
                                        groupId: "insert",
                                        success: function (oData, oResponse) {


                                            // MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);
                                        },
                                        error: function (oData, oResponse) {
                                        }
                                    });
                                    resolve();
                                });


                                iNew++;
                                if (iNew === aNewRows.length) {

                                    // await me.UpdateIOHdrQuantity();
                                    // await me.getHeaderData();

                                    // MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);

                                    if (arg === "IODET") {
                                        me.byId("btnNewDlvSched").setVisible(true);
                                        me.byId("btnImportPODlvSched").setVisible(true);
                                        me.byId("btnEditDlvSched").setVisible(true);
                                        me.byId("btnDeleteDlvSched").setVisible(true);
                                        me.byId("btnCopyDlvSched").setVisible(true);
                                        me.byId("btnRefreshDlvSched").setVisible(true);
                                        me.byId("btnGenMatList").setVisible(true);
                                        me.byId("btnSaveDlvSched").setVisible(false);
                                        me.byId("btnCancelDlvSched").setVisible(false);
                                        me.byId("btnFullScreenDlvSched").setVisible(true);

                                        me.byId("btnNewIODet").setVisible(true);
                                        me.byId("btnEditIODet").setVisible(true);
                                        // me.byId("btnDeleteIODet").setVisible(true);
                                        // me.byId("btnCopyIODet").setVisible(true);
                                        me.byId("btnRefreshIODet").setVisible(true);
                                        me.byId("btnSaveIODet").setVisible(false);
                                        me.byId("btnCancelIODet").setVisible(false);
                                        me.byId("btnFullScreenIODet").setVisible(true);
                                    }

                                    // if (arg !== "IODET")
                                    //     me.setActiveRowHighlightByTableId(arg + "Tab");

                                    var oIconTabBar = me.byId("idIconTabBarInlineMode");
                                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                                    me.byId(arg + "Tab").getModel("DataModel").getData().results.forEach((row, index) => {
                                        me.byId(arg + "Tab").getModel("DataModel").setProperty('/results/' + index + '/EDITED', false);
                                    })

                                    me._dataMode = "READ";

                                    MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);

                                }
                            })

                            this.setRowReadMode(arg);
                        } else {
                            Common.closeProcessingDialog(me);
                            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                            return;
                        }

                    }
                    //PROCESS EDITED ROW DATA
                    else if (aEditedRows.length > 0) {
                        if (this._validationErrors.length === 0) {
                            var entitySet = "/";
                            var updEntitySet;
                            var oUpdModel;

                            switch (arg) {
                                case "IODET":
                                    entitySet = entitySet + "IODETSet"
                                    oUpdModel = me.getOwnerComponent().getModel();
                                    break;
                                default: break;
                            }

                            // oUpdModel.setUseBatch(true);
                            // oUpdModel.setDeferredGroups(["update"]);

                            // var mParameters = {
                            //     "groupId": "update"
                            // };

                            //APPLY SIZE DATAMODEL UNPIVOT
                            var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");

                            //LOOP THRU NEW ROWS (CURRENTLY ONE ROW IMPLEM)
                            aEditedRows.forEach(async item => {
                                //LOOP THRU COLLECTION OF SIZES FOR THE IO
                                this._iosizes.forEach(async colSizes => {
                                    updEntitySet = entitySet;
                                    updEntitySet += "(IONO='" + item["IONO"] + "',";
                                    hasMatchingSize = false;
                                    var param = {};
                                    var pIOITEM;
                                    // param["IONO"] = me._ioNo;
                                    param["IONO"] = cIONo;

                                    //LOOP THRU COLLECTION OF COLUMNS OF THE DATAMODEL
                                    this._aColumns[arg].forEach(col => {
                                        //FILTER COLUMNS: NOT A KEY COLUMN AND COLUMN HAS VALUE
                                        if (col.Key !== "X" && item[col.ColumnName] !== undefined) {
                                            //IF DATETIME DATATYPE: FORMAT VALUE AS VALID ABAP DATETIME FORMAT
                                            if (col.DataType === "DATETIME") {
                                                // alert(item[col.ColumnName]);
                                                // if(item[col.ColumnName] !== "" || item[col.ColumnName] !== "0000-00-00" || item[col.ColumnName] !== null || item[col.ColumnName] !== undefined) {
                                                //     param[col.ColumnName] = sapDateFormat.format(new Date(item[col.ColumnName])) //+ "T00:00:00" //DlvDt
                                                // }
                                                //IF COLUMN NAME IS EQUAL WITH IOSIZE ATTRIBUTE CODE
                                            } else if (col.ColumnName === colSizes.ATTRIBCD + "REVORDERQTY") {
                                                //SET CUSTSIZE : USE ATTRIBUTE CODE
                                                param["CUSTSIZE"] = colSizes.ATTRIBCD === "" ? "" : colSizes.ATTRIBCD
                                                //SET REVORDERQTY : USE QUANTITY AT SIZE COLUMNS THAT MATCH THE IO SIZE
                                                param["REVORDERQTY"] = item[col.ColumnName] === "" ? "0" : item[col.ColumnName]
                                                //SET IOITEM 
                                                param["IOITEM"] = item["IOITEM" + colSizes.ATTRIBCD + "REVORDERQTY"]
                                                updEntitySet += "IOITEM='" + item["IOITEM" + colSizes.ATTRIBCD + "REVORDERQTY"] + "'"

                                                // param["IOITEM"] = item["IOITEM" + colSizes.ATTRIBCD]
                                                // updEntitySet += "IOITEM='" + item["IOITEM" + colSizes.ATTRIBCD] + "'"

                                                //SET hasMatchingSize VARIABLE AS TRUE; THIS IS NEED IF THE SIZE MUST BE REMOVED FROM THE JSON ARRAY
                                                hasMatchingSize = true;
                                            } else if (col.ColumnName === colSizes.ATTRIBCD + "SHIPQTY") {
                                                //SET CUSTSIZE : USE ATTRIBUTE CODE
                                                param["CUSTSIZE"] = colSizes.ATTRIBCD === "" ? "" : colSizes.ATTRIBCD
                                                //SET REVORDERQTY : USE QUANTITY AT SIZE COLUMNS THAT MATCH THE IO SIZE
                                                param["SHIPQTY"] = item[col.ColumnName] === "" ? "0" : item[col.ColumnName]
                                                //SET hasMatchingSize VARIABLE AS TRUE; THIS IS NEED IF THE SIZE MUST BE REMOVED FROM THE JSON ARRAY
                                                hasMatchingSize = true;
                                            } else {
                                                //SET OTHER COLUMNS NOT RELATED TO SIZE AND DATETIME
                                                param[col.ColumnName] = item[col.ColumnName] === "" ? "" : item[col.ColumnName]
                                            }
                                        }
                                    })

                                    //REMOVE SIZE COLUMNS NOT APPLICABLE FOR UNPIVOT
                                    // console.log("REMOVE SIZE COLUMNS NOT APPLICABLE FOR UNPIVOT");
                                    this._iosizes.forEach(colSizesRemove => {
                                        // console.log(colSizesRemove.ATTRIBCD);
                                        delete param[colSizesRemove.ATTRIBCD + "REVORDERQTY"];
                                        delete param["IOITEM" + colSizesRemove.ATTRIBCD + "REVORDERQTY"];
                                        delete param[colSizesRemove.ATTRIBCD + "SHIPQTY"];
                                        delete param["IOITEM" + colSizesRemove.ATTRIBCD + "SHIPQTY"];
                                        // if (colSizes.ATTRIBCD !== colSizesRemove.ATTRIBCD) {
                                        //     delete param[colSizesRemove.ATTRIBCD];
                                        //     delete param["IOITEM" + colSizesRemove.ATTRIBCD + "ORDERQTY"];
                                        // }
                                    })

                                    // //REMOVE IOITEM WITH SIZE COLUMNS NOT APPLICABLE FOR UNPIVOT
                                    // this._iosizes.forEach(colSizesRemove => {
                                    //     if (colSizes.ATTRIBCD === colSizesRemove.ATTRIBCD) {
                                    //         delete param["IOITEM" + colSizesRemove.ATTRIBCD + "SHIPQTY"];
                                    //     }
                                    // })

                                    updEntitySet += ")";

                                    // console.log(updEntitySet);
                                    // console.log(param);
                                    // console.log(arg);

                                    // return;

                                    // //CREATE ENTRIES USING BATCH PROCESSING
                                    // oUpdModel.update(entitySet, param, mParameters);

                                    await new Promise((resolve, reject) => {
                                        setTimeout(() => {
                                            oUpdModel.update(updEntitySet, param, {
                                                method: "PUT",
                                                success: function (data, oResponse) {
                                                    resolve();
                                                },
                                                error: function () {
                                                    iEdited++;
                                                    // alert("Error");
                                                    resolve();
                                                    if (iEdited === aEditedRows.length) Common.closeProcessingDialog(me);
                                                }
                                            })

                                        }, 100);
                                        resolve();
                                    });
                                    // await _promiseResult;
                                });

                                // oUpdModel.submitChanges({
                                //     groupId: "update",
                                //     success: function (oData, oResponse) {

                                //         setTimeout(() => {
                                //             me.UpdateIOHdrQuantity();
                                //         }, 100);

                                //         setTimeout(() => {
                                //             me.getHeaderData();
                                //         }, 100);

                                //         MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);
                                //     },
                                //     error: function (oData, oResponse) {
                                //     }
                                // });


                                // return;

                                iEdited++;
                                if (iEdited === aEditedRows.length) {

                                    // await me.UpdateIOHdrQuantity();
                                    // await me.getHeaderData();

                                    // MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);

                                    if (arg === "IODET") {
                                        me.byId("btnNewDlvSched").setVisible(true);
                                        me.byId("btnImportPODlvSched").setVisible(true);
                                        me.byId("btnEditDlvSched").setVisible(true);
                                        me.byId("btnDeleteDlvSched").setVisible(true);
                                        me.byId("btnCopyDlvSched").setVisible(true);
                                        me.byId("btnRefreshDlvSched").setVisible(true);
                                        me.byId("btnSaveDlvSched").setVisible(false);
                                        me.byId("btnCancelDlvSched").setVisible(false);
                                        me.byId("btnFullScreenDlvSched").setVisible(true);
                                        me.byId("btnGenMatList").setVisible(true);

                                        me.byId("btnNewIODet").setVisible(true);
                                        me.byId("btnEditIODet").setVisible(true);
                                        // me.byId("btnDeleteIODet").setVisible(true);
                                        // me.byId("btnCopyIODet").setVisible(true);
                                        me.byId("btnRefreshIODet").setVisible(true);
                                        me.byId("btnSaveIODet").setVisible(false);
                                        me.byId("btnCancelIODet").setVisible(false);
                                        me.byId("btnFullScreenIODet").setVisible(true);
                                    }

                                    // if (arg !== "IODET")
                                    //     me.setActiveRowHighlightByTableId(arg + "Tab");

                                    var oIconTabBar = me.byId("idIconTabBarInlineMode");
                                    oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                                    me.byId(arg + "Tab").getModel("DataModel").getData().results.forEach((row, index) => {
                                        me.byId(arg + "Tab").getModel("DataModel").setProperty('/results/' + index + '/EDITED', false);
                                    })

                                    me._dataMode = "READ";

                                    MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);
                                }
                            })

                            this.setRowReadMode(arg);
                        } else {
                            Common.closeProcessingDialog(me);
                            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                            return;
                        }
                    }

                    // return;

                    if (aNewRows.length <= 0 && aEditedRows.length <= 0) {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_MODIFIED"]);
                    }
                    else {
                        //reload data based on arguments
                        var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");
                        var oModelColumns = new JSONModel();
                        await oModelColumns.loadData(sPath);

                        var oColumns = oModelColumns.getData();

                        switch (arg) {
                            case "IODET":
                                await this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);

                                //RELOAD IO DELIVERY DATA PER IO
                                await this.reloadIOData("IODLVTab", "/IODLVSet");

                                break;
                            default:
                                break;
                        }

                        this._bIODETChanged = false;
                    }

                    // setTimeout(async () => {
                    //     await me.UpdateIOHdrQuantity();
                    // }, 100);

                    // setTimeout(async () => {
                    //     await me.refreshHeaderData();
                    // }, 100);

                    me.unLock();
                    Common.closeProcessingDialog(me);

                    // console.log(this.getView().getModel("ui2").getProperty("/IOOrdQty"));
                    // console.log(this.getView().getModel("ui2").getProperty("/IORevOrdQty"));
                    // this.getView().byId("REVORDQTY").setValue(this.getView().getModel("ui2").getProperty("/IORevOrdQty"));
                    // } else
                    //     MessageBox.error(this.getView().getModel("ui").getProperty("/LockMessage"));
                } else {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                    return;
                }
            },

            async onSave(arg) {
                // alert("on Save");
                var me = this;
                var bProceed = true;
                var aNewRows = this.byId(arg + "Tab").getModel().getData().rows.filter(item => item.New === true);
                var iNew = 0;
                var aEditedRows = this.byId(arg + "Tab").getModel().getData().rows.filter(item => item.EDITED === true && item.New !== true);
                var iEdited = 0;

                // console.log(aNewRows);
                // console.log(aEditedRows);
                // return;

                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();

                if (arg === "IODLV") {
                    if (bProceed) {
                        // console.log(this.byId("IODLVTab").getModel().oData.rows);
                        this.byId("IODLVTab").getModel().oData.rows.forEach(item => {
                            if (item.CPONO === "" || item.CPONO === undefined
                                || item.CPOREV === "" || item.CPOREV === undefined
                                || item.CPOITEM === "" || item.CPOITEM === undefined
                                || item.DLVDT === "" || item.DLVDT === undefined
                                || item.REVDLVDT === "" || item.REVDLVDT === undefined
                                || item.CUSTSHIPTO === "" || item.CUSTSHIPTO === undefined
                                || item.CUSTBILLTO === "" || item.CUSTBILLTO === undefined) {
                                bProceed = false;
                            }
                        })
                    }
                }

                if (aNewRows.length > 0) {
                    if (bProceed) {
                        if (this._validationErrors.length === 0) {
                            await me.lock(me);
                            var entitySet = "/";
                            var oModel;

                            switch (arg) {
                                case "IODLV":
                                    entitySet = entitySet + "IODLVSet"
                                    oModel = me.getOwnerComponent().getModel();
                                    break;
                                case "IODET":
                                    entitySet = entitySet + "IODETSet"
                                    oModel = me.getOwnerComponent().getModel();
                                    break;
                                case "IOATTRIB":
                                    entitySet = entitySet + "IOATTRIBTYPSet"
                                    oModel = me.getOwnerComponent().getModel();
                                    break;
                                default: break;
                            }

                            var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");

                            Common.openProcessingDialog(me, "Processing...");

                            aNewRows.forEach(item => {
                                var param = {};
                                // param["IONO"] = me._ioNo;
                                param["IONO"] = cIONo;

                                this._aColumns[arg].forEach(col => {
                                    if (col.Key !== "X" && item[col.ColumnName] !== undefined) {
                                        if (col.DataType === "DATETIME") {
                                            param[col.ColumnName] = sapDateFormat.format(new Date(item[col.ColumnName])) //+ "T00:00:00" //DlvDt
                                        } else {
                                            param[col.ColumnName] = item[col.ColumnName] === "" ? "" : item[col.ColumnName]
                                        }
                                    }
                                })

                                // console.log(entitySet);
                                // console.log(param);
                                // console.log(arg);

                                // return;

                                // Common.openProcessingDialog(me, "Processing...");

                                setTimeout(() => {
                                    oModel.create(entitySet, param, {
                                        method: "POST",
                                        success: async function (data, oResponse) {
                                            iNew++;

                                            if (iNew === aNewRows.length) {
                                                Common.closeProcessingDialog(me);
                                                MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);

                                                if (arg === "IODLV") {
                                                    me.byId("btnNewDlvSched").setVisible(true);
                                                    me.byId("btnImportPODlvSched").setVisible(true);
                                                    me.byId("btnEditDlvSched").setVisible(true);
                                                    me.byId("btnDeleteDlvSched").setVisible(true);
                                                    me.byId("btnCopyDlvSched").setVisible(true);
                                                    me.byId("btnRefreshDlvSched").setVisible(true);
                                                    me.byId("btnGenMatList").setVisible(true);
                                                    me.byId("btnSaveDlvSched").setVisible(false);
                                                    me.byId("btnCancelDlvSched").setVisible(false);
                                                    me.byId("btnFullScreenDlvSched").setVisible(true);

                                                    me.byId("btnNewIODet").setVisible(true);
                                                    me.byId("btnEditIODet").setVisible(true);
                                                    // me.byId("btnDeleteIODet").setVisible(true);
                                                    // me.byId("btnCopyIODet").setVisible(true);
                                                    me.byId("btnRefreshIODet").setVisible(true);
                                                    me.byId("btnSaveIODet").setVisible(false);
                                                    me.byId("btnCancelIODet").setVisible(false);
                                                    me.byId("btnFullScreenIODet").setVisible(true);
                                                }
                                                else if (arg === "IODET") {
                                                    me.byId("btnNewDlvSched").setVisible(true);
                                                    me.byId("btnImportPODlvSched").setVisible(true);
                                                    me.byId("btnEditDlvSched").setVisible(true);
                                                    me.byId("btnDeleteDlvSched").setVisible(true);
                                                    me.byId("btnCopyDlvSched").setVisible(true);
                                                    me.byId("btnRefreshDlvSched").setVisible(true);
                                                    me.byId("btnGenMatList").setVisible(true);
                                                    me.byId("btnSaveDlvSched").setVisible(false);
                                                    me.byId("btnCancelDlvSched").setVisible(false);
                                                    me.byId("btnFullScreenDlvSched").setVisible(true);

                                                    me.byId("btnNewIODet").setVisible(true);
                                                    me.byId("btnEditIODet").setVisible(true);
                                                    // me.byId("btnDeleteIODet").setVisible(true);
                                                    // me.byId("btnCopyIODet").setVisible(true);
                                                    me.byId("btnRefreshIODet").setVisible(true);
                                                    me.byId("btnSaveIODet").setVisible(false);
                                                    me.byId("btnCancelIODet").setVisible(false);
                                                    me.byId("btnFullScreenIODet").setVisible(true);
                                                }

                                                if (arg !== "IODET")
                                                    me.setActiveRowHighlightByTableId(arg + "Tab");

                                                var oIconTabBar = me.byId("idIconTabBarInlineMode");
                                                oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                                                // if (arg === "IODLV" || arg === "IODET") {
                                                //     var oIconTabBarStyle = me.byId("itfDLVSCHED");
                                                //     oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));
                                                // }

                                                if (arg === "IODLV") {

                                                    await me.reloadIOData("IODLVTab", "/IODLVSet");

                                                    me.setActiveRowHighlightByTableId("IODLVTab");

                                                    me._tblChange = true;
                                                    await me.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);
                                                    me._tblChange = false;
                                                }

                                                me.byId(arg + "Tab").getModel().getData().rows.forEach((row, index) => {
                                                    me.byId(arg + "Tab").getModel().setProperty('/rows/' + index + '/EDITED', false);
                                                })

                                                me._dataMode = "READ";
                                                // me.unLock();
                                                Common.closeProcessingDialog(me);
                                            }
                                        },
                                        error: function () {
                                            iNew++;
                                            // alert("Error");
                                            // if (iNew === aNewRows.length) Common.closeProcessingDialog(me);
                                        }
                                    });
                                }, 100)
                            })
                            this.unLock();
                            this.setRowReadMode(arg);
                        }
                        else {
                            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                        }
                    }
                    else {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CREATE_CHECK_REQD"]);
                    }
                }
                else if (aEditedRows.length > 0) {
                    if (bProceed) {
                        if (this._validationErrors.length === 0) {
                            await me.lock(me);
                            var entitySet = "/";
                            var oModel;

                            switch (arg) {
                                case "color":
                                    entitySet = entitySet + "AttribSet";
                                    oModel = me.getOwnerComponent().getModel("ZGW_3DERP_IOSTYLE_SRV");
                                    oModel.setHeaders({ UPDTYP: "UPDATE" });
                                    break;
                                case "process":
                                    entitySet = entitySet + "ProcessSet";
                                    oModel = me.getOwnerComponent().getModel("ZGW_3DERP_IOSTYLE_SRV");
                                    break;
                                case "ioMatList":
                                    entitySet = entitySet + "MainSet";
                                    oModel = me.getOwnerComponent().getModel("ZGW_3DERP_IOMATLIST_SRV");
                                    oModel.setHeaders({ UPDTYP: "MAIN" });
                                    break;
                                case "IODLV":
                                    entitySet = entitySet + "IODLVSet"
                                    oModel = me.getOwnerComponent().getModel();
                                    break;
                                case "IODET":
                                    entitySet = entitySet + "IODETSet"
                                    oModel = me.getOwnerComponent().getModel();
                                    break;
                                case "IOATTRIB":
                                    entitySet = entitySet + "IOATTRIBSet"
                                    // oModel = me.getOwnerComponent().getModel();
                                    oModel = this._oModel;
                                    break;
                                case "costHdr":
                                    entitySet = entitySet + "VersionsSet";
                                    oModel = this._oModelIOCosting;
                                    break;
                                case "costDtls":
                                    entitySet = entitySet + "DetailsSet";
                                    oModel = this._oModelIOCosting;
                                    break;
                                default:
                                    break;
                            }

                            var centitySet = entitySet;

                            Common.openProcessingDialog(me, "Processing...");

                            // console.log("Edited Rows");
                            // console.log(aEditedRows);
                            aEditedRows.forEach(async item => {

                                // console.log(item);
                                // var entitySet = "/" + (arg === "color" ? "AttribSet" : "ProcessSet") + "(";
                                entitySet = centitySet + "(";
                                var param = {};
                                var iKeyCount = this._aColumns[arg].filter(col => col.Key === "X").length;
                                var itemValue;
                                // console.log(this._aColumns[arg])
                                this._aColumns[arg].forEach(col => {
                                    if (arg === "costHdr" && col.DataType === "DATETIME") itemValue = sapDateFormat.format(new Date(item[col.ColumnName])) + "T00:00:00"
                                    //SET FORMAT OF DATE ALIGNED TO ABAP WHEN CREATING PAYLOAD
                                    else if (col.DataType === "DATETIME") {
                                        // console.log(col.ColumnName);
                                        // console.log(item[col.ColumnName]);
                                        // console.log(sapDateFormat.format(new Date(item[col.ColumnName])));
                                        itemValue = sapDateFormat.format(new Date(item[col.ColumnName]));
                                    } else {
                                        itemValue = item[col.ColumnName];
                                    }

                                    //IF IODLV || IODET, INCLUDE KEYS IN PAYLOAD 
                                    if (arg === "IODLV" || arg === "IODET" || arg === "IOATTRIB") {
                                        if(col.Key === "X")
                                            param[col.ColumnName] = itemValue;
                                        
                                        if(col.Editable)
                                            param[col.ColumnName] = itemValue;
                                    }
                                    //COLLECT EDITABLE FIELDS ONLY FOR OTHER ARG VALUE
                                    // else if(arg === "IOATTRIB") {
                                    //     console.log(col.ColumnName);
                                    //     console.log(col.DataType);
                                    //     if(col.DataType === "DATETIME") {
                                    //         param[col.ColumnName] = sapDateFormat.format(new Date(itemValue)) + "T00:00:00";
                                    //     } else if(col.DataType === "TIME") {
                                    //         param[col.ColumnName] = timeFormat.format(new Date(itemValue.ms + TZOffsetMs));                                            
                                    //     } else {
                                    //         param[col.ColumnName] = itemValue;
                                    //     }                                             
                                    // } 
                                    else {
                                        if (col.Editable) {
                                            param[col.ColumnName] = itemValue;
                                        }
                                    }

                                    if (iKeyCount === 1) {
                                        if (col.Key === "X") {
                                            if(col.DictType.indexOf("INT") !== -1)
                                                entitySet += item[col.ColumnName]
                                            else
                                                entitySet += "'" + item[col.ColumnName] + "'"
                                        }
                                    }
                                    else if (iKeyCount > 1) {
                                        if (col.Key === "X") {
                                            // console.log(col.DictType);
                                            // console.log(col.DictType.indexOf("INT"));
                                            // if (col.ColumnName === "DLVSEQ")
                                            if(col.DictType.indexOf("INT") !== -1)
                                                entitySet += col.ColumnName + "=" + item[col.ColumnName] + ","
                                            else
                                                entitySet += col.ColumnName + "='" + item[col.ColumnName] + "',"
                                        }
                                    }
                                })

                                if (iKeyCount > 1) entitySet = entitySet.substring(0, entitySet.length - 1);
                                entitySet += ")";

                                console.log(entitySet);
                                console.log(param);
                                console.log(arg);
                                console.log("oModel");
                                console.log(oModel)

                                // if (arg === "color") {
                                //     me.byId("btnEditColor").setVisible(true);
                                //     me.byId("btnSaveColor").setVisible(false);
                                //     me.byId("btnCancelColor").setVisible(false);
                                //     me.byId("btnRefreshColor").setVisible(true);
                                // }
                                // else if (arg === "process") {
                                //     me.byId("btnEditProcess").setVisible(true);
                                //     me.byId("btnSaveProcess").setVisible(false);
                                //     me.byId("btnCancelProcess").setVisible(false);
                                //     me.byId("btnRefreshProcess").setVisible(true);
                                // }
                                // else if (arg === "ioMatList") {
                                //     me.byId("btnSubmitMRP").setVisible(true);
                                //     me.byId("btnAssignMatNo").setVisible(true);
                                //     me.byId("btnEditIOMatList").setVisible(true);
                                //     me.byId("btnRefreshIOMatList").setVisible(true);
                                //     me.byId("btnExportIOMatList").setVisible(true);
                                //     me.byId("btnSaveIOMatList").setVisible(false);
                                //     me.byId("btnCancelIOMatList").setVisible(false);
                                //     me.byId("btnReorderIOMatList").setVisible(true);
                                //     me.byId("btnDeleteIOMatList").setVisible(true);
                                //     me.byId("btnTabLayoutIOMatList").setVisible(true);
                                // }
                                // else if (arg === "IODLV") {
                                //     me.byId("btnNewDlvSched").setVisible(true);
                                //     me.byId("btnImportPODlvSched").setVisible(true);
                                //     me.byId("btnEditDlvSched").setVisible(true);
                                //     me.byId("btnDeleteDlvSched").setVisible(true);
                                //     me.byId("btnCopyDlvSched").setVisible(true);
                                //     me.byId("btnRefreshDlvSched").setVisible(true);
                                //     me.byId("btnGenMatList").setVisible(true);
                                //     me.byId("btnSaveDlvSched").setVisible(false);
                                //     me.byId("btnCancelDlvSched").setVisible(false);
                                //     me.byId("btnFullScreenDlvSched").setVisible(true);
                                // }
                                // else if (arg === "IOATTRIB") {
                                //     this.byId("onIOAttribEdit").setVisible(true);
                                //     this.byId("onIOAttribSave").setVisible(false);
                                //     this.byId("onIOAttribCancel").setVisible(false);
                                // }
                                // _promiseResult = new Promise((resolve, reject) => {
                                setTimeout(() => {
                                    console.log("PUT");
                                    oModel.update(entitySet, param, {
                                        method: "PUT",
                                        success: async function (data, oResponse) {
                                            iEdited++;
                                            // resolve();
                                            console.log(oResponse);

                                            if (iEdited === aEditedRows.length) {
                                                // Common.closeProcessingDialog(me);
                                                MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);

                                                if (arg === "color") {
                                                    me.byId("btnEditColor").setVisible(true);
                                                    me.byId("btnSaveColor").setVisible(false);
                                                    me.byId("btnCancelColor").setVisible(false);
                                                    me.byId("btnRefreshColor").setVisible(true);
                                                }
                                                else if (arg === "process") {
                                                    me.byId("btnEditProcess").setVisible(true);
                                                    me.byId("btnSaveProcess").setVisible(false);
                                                    me.byId("btnCancelProcess").setVisible(false);
                                                    me.byId("btnRefreshProcess").setVisible(true);
                                                }
                                                else if (arg === "ioMatList") {
                                                    me.byId("btnSubmitMRP").setVisible(true);
                                                    me.byId("btnAssignMatNo").setVisible(true);
                                                    me.byId("btnEditIOMatList").setVisible(true);
                                                    me.byId("btnRefreshIOMatList").setVisible(true);
                                                    me.byId("btnExportIOMatList").setVisible(true);
                                                    me.byId("btnSaveIOMatList").setVisible(false);
                                                    me.byId("btnCancelIOMatList").setVisible(false);
                                                    me.byId("btnReorderIOMatList").setVisible(true);
                                                    me.byId("btnDeleteIOMatList").setVisible(true);
                                                }
                                                else if (arg === "IODLV") {
                                                    me.byId("btnNewDlvSched").setVisible(true);
                                                    me.byId("btnImportPODlvSched").setVisible(true);
                                                    me.byId("btnEditDlvSched").setVisible(true);
                                                    me.byId("btnDeleteDlvSched").setVisible(true);
                                                    me.byId("btnCopyDlvSched").setVisible(true);
                                                    me.byId("btnRefreshDlvSched").setVisible(true);
                                                    me.byId("btnGenMatList").setVisible(true);
                                                    me.byId("btnSaveDlvSched").setVisible(false);
                                                    me.byId("btnCancelDlvSched").setVisible(false);
                                                    me.byId("btnFullScreenDlvSched").setVisible(true);

                                                    me.byId("btnNewIODet").setVisible(true);
                                                    me.byId("btnEditIODet").setVisible(true);
                                                    // me.byId("btnDeleteIODet").setVisible(true);
                                                    // me.byId("btnCopyIODet").setVisible(true);
                                                    me.byId("btnRefreshIODet").setVisible(true);
                                                    me.byId("btnSaveIODet").setVisible(false);
                                                    me.byId("btnCancelIODet").setVisible(false);
                                                    me.byId("btnFullScreenIODet").setVisible(true);
                                                }
                                                else if (arg === "IODET") {
                                                    me.byId("btnNewDlvSched").setVisible(true);
                                                    me.byId("btnImportPODlvSched").setVisible(true);
                                                    me.byId("btnEditDlvSched").setVisible(true);
                                                    me.byId("btnDeleteDlvSched").setVisible(true);
                                                    me.byId("btnCopyDlvSched").setVisible(true);
                                                    me.byId("btnRefreshDlvSched").setVisible(true);
                                                    me.byId("btnGenMatList").setVisible(true);
                                                    me.byId("btnSaveDlvSched").setVisible(false);
                                                    me.byId("btnCancelDlvSched").setVisible(false);
                                                    me.byId("btnFullScreenDlvSched").setVisible(true);

                                                    me.byId("btnNewIODet").setVisible(true);
                                                    me.byId("btnEditIODet").setVisible(true);
                                                    // me.byId("btnDeleteIODet").setVisible(true);
                                                    // me.byId("btnCopyIODet").setVisible(true);
                                                    me.byId("btnRefreshIODet").setVisible(true);
                                                    me.byId("btnSaveIODet").setVisible(false);
                                                    me.byId("btnCancelIODet").setVisible(false);
                                                    me.byId("btnFullScreenIODet").setVisible(true);
                                                }
                                                else if (arg === "costHdr") {
                                                    me.byId("btnNewCostHdr").setVisible(true);
                                                    me.byId("btnEditCostHdr").setVisible(true);
                                                    me.byId("btnRefreshCostHdr").setVisible(true);
                                                    me.byId("btnSaveCostHdr").setVisible(false);
                                                    me.byId("btnCancelCostHdr").setVisible(false);

                                                    me.byId("btnEditCostDtl").setEnabled(true);
                                                    me.byId("btnPrintCosting").setEnabled(true);
                                                    me.byId("btnReleaseCosting").setEnabled(true);
                                                    me.byId("btnRefreshCostDtl").setEnabled(true);
                                                }
                                                else if (arg === "costDtls") {
                                                    me.byId("btnEditCostDtl").setVisible(true);
                                                    me.byId("btnPrintCosting").setVisible(true);
                                                    me.byId("btnReleaseCosting").setVisible(true);
                                                    me.byId("btnRefreshCostDtl").setVisible(true);
                                                    me.byId("btnSaveCostDtl").setVisible(false);
                                                    me.byId("btnCancelCostDtl").setVisible(false);

                                                    me.byId("btnNewCostHdr").setEnabled(true);
                                                    me.byId("btnEditCostHdr").setEnabled(true);
                                                    me.byId("btnRefreshCostHdr").setEnabled(true);
                                                }
                                                else if (arg === "IOATTRIB") {
                                                    me.byId("onIOAttribEdit").setVisible(true);
                                                    me.byId("onIOAttribSave").setVisible(false);
                                                    me.byId("onIOAttribCancel").setVisible(false);
                                                }

                                                if (arg !== "IODET")
                                                    me.setActiveRowHighlightByTableId(arg + "Tab");

                                                if (arg === "IODLV") {
                                                    await me.reloadIOData("IODLVTab", "/IODLVSet");
                                                }

                                                if (arg === "color" || arg === "process") {
                                                    var oIconTabBarStyle = me.byId("itbStyleDetail");
                                                    oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));
                                                }
                                                // else if (arg === "IODLV" || arg === "IODET") {
                                                //     var oIconTabBarStyle = me.byId("idIconTabBarInlineMode");
                                                //     oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));
                                                // } 
                                                // else {
                                                var oIconTabBar = me.byId("idIconTabBarInlineMode");
                                                oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                                                // }

                                                me.byId(arg + "Tab").getModel().getData().rows.forEach((row, index) => {
                                                    me.byId(arg + "Tab").getModel().setProperty('/rows/' + index + '/EDITED', false);
                                                })

                                                me._dataMode = "READ";
                                                // me.unLock();
                                                Common.closeProcessingDialog(me);
                                            }
                                        },
                                        error: function () {
                                            iEdited++;
                                            // resolve();
                                            // alert("Error");
                                            if (iEdited === aEditedRows.length) Common.closeProcessingDialog(me);
                                        }
                                    });
                                }, 500);
                                // })
                                // await _promiseResult;
                            })

                            this.unLock();
                            this.setRowReadMode(arg);
                        }

                        //this._validationErrors.length
                        else {
                            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                            return;
                        }
                    }
                    else {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CREATE_CHECK_REQD"]);
                    }
                }
                else {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_MODIFIED"]);
                    return;
                }

                //reload data based on arguments
                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();
                switch (arg) {
                    // case "IODLV":
                    //     console.log("refresh IO Delivery Data");
                    //     _promiseResult = new Promise((resolve, reject) => {
                    //         setTimeout(() => {
                    //             this.reloadIOData("IODLVTab", "/IODLVSet");
                    //         }, 100);
                    //         resolve();
                    //     });
                    //     await _promiseResult;
                    //     break;

                    case "IODET":
                        //RELOAD IO DETAIL DATA PER IO & DLVSEQ
                        await this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);

                        //RELOAD IO DELIVERY DATA PER IO
                        await this.reloadIOData("IODLVTab", "/IODLVSet");
                        this._bIODLVChanged = false;
                        break;

                    case "IOATTRIB":
                        await this.reloadIOData("IOATTRIBTab", "/IOATTRIBSet");
                        this._bIOATTRIBChanged = false;

                        break;

                    default: break;
                }
            },

            async onBatchSave(arg) {
                // alert("on Save");
                var me = this;

                var aNewRows = this.byId(arg + "Tab").getModel().getData().rows.filter(item => item.New === true);
                var iNew = 0;
                var aEditedRows = this.byId(arg + "Tab").getModel().getData().rows.filter(item => item.EDITED === true && item.New !== true);
                var iEdited = 0;

                // console.log(aNewRows);
                // console.log(aEditedRows);
                // return;

                if (aNewRows.length > 0) {
                    if (this._validationErrors.length === 0) {
                        var entitySet = "/";
                        var oModel;

                        switch (arg) {
                            case "IODLV":
                                entitySet = entitySet + "IODLVSet"
                                oModel = me.getOwnerComponent().getModel();
                                break;
                            case "IODET":
                                entitySet = entitySet + "IODETSet"
                                oModel = me.getOwnerComponent().getModel();
                                break;
                            default: break;
                        }

                        var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");

                        Common.openProcessingDialog(me, "Processing...");

                        aNewRows.forEach(item => {
                            var param = {};
                            // param["IONO"] = me._ioNo;
                            param["IONO"] = cIONo;

                            this._aColumns[arg].forEach(col => {
                                if (col.Key !== "X" && item[col.ColumnName] !== undefined) {
                                    if (col.DataType === "DATETIME") {
                                        param[col.ColumnName] = sapDateFormat.format(new Date(item[col.ColumnName])) //+ "T00:00:00" //DlvDt
                                    } else {
                                        param[col.ColumnName] = item[col.ColumnName] === "" ? "" : item[col.ColumnName]
                                    }
                                }
                            })

                            // console.log(entitySet);
                            // console.log(param);
                            // console.log(arg);

                            // return;

                            // Common.openProcessingDialog(me, "Processing...");

                            setTimeout(() => {
                                oModel.create(entitySet, param, {
                                    method: "POST",
                                    success: function (data, oResponse) {
                                        iNew++;

                                        if (iNew === aNewRows.length) {
                                            Common.closeProcessingDialog(me);
                                            MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);

                                            if (arg === "IODLV") {
                                                me.byId("btnNewDlvSched").setVisible(true);
                                                me.byId("btnImportPODlvSched").setVisible(true);
                                                me.byId("btnEditDlvSched").setVisible(true);
                                                me.byId("btnDeleteDlvSched").setVisible(true);
                                                me.byId("btnCopyDlvSched").setVisible(true);
                                                me.byId("btnRefreshDlvSched").setVisible(true);
                                                me.byId("btnGenMatList").setVisible(true);
                                                me.byId("btnSaveDlvSched").setVisible(false);
                                                me.byId("btnCancelDlvSched").setVisible(false);
                                                me.byId("btnFullScreenDlvSched").setVisible(true);

                                                me.byId("btnNewIODet").setVisible(true);
                                                me.byId("btnEditIODet").setVisible(true);
                                                // me.byId("btnDeleteIODet").setVisible(true);
                                                // me.byId("btnCopyIODet").setVisible(true);
                                                me.byId("btnRefreshIODet").setVisible(true);
                                                me.byId("btnSaveIODet").setVisible(false);
                                                me.byId("btnCancelIODet").setVisible(false);
                                                me.byId("btnFullScreenIODet").setVisible(true);
                                            }
                                            else if (arg === "IODET") {
                                                me.byId("btnNewDlvSched").setVisible(true);
                                                me.byId("btnImportPODlvSched").setVisible(true);
                                                me.byId("btnEditDlvSched").setVisible(true);
                                                me.byId("btnDeleteDlvSched").setVisible(true);
                                                me.byId("btnCopyDlvSched").setVisible(true);
                                                me.byId("btnRefreshDlvSched").setVisible(true);
                                                me.byId("btnGenMatList").setVisible(true);
                                                me.byId("btnSaveDlvSched").setVisible(false);
                                                me.byId("btnCancelDlvSched").setVisible(false);
                                                me.byId("btnFullScreenDlvSched").setVisible(true);

                                                me.byId("btnNewIODet").setVisible(true);
                                                me.byId("btnEditIODet").setVisible(true);
                                                // me.byId("btnDeleteIODet").setVisible(true);
                                                // me.byId("btnCopyIODet").setVisible(true);
                                                me.byId("btnRefreshIODet").setVisible(true);
                                                me.byId("btnSaveIODet").setVisible(false);
                                                me.byId("btnCancelIODet").setVisible(false);
                                                me.byId("btnFullScreenIODet").setVisible(true);
                                            }

                                            if (arg !== "IODET")
                                                me.setActiveRowHighlightByTableId(arg + "Tab");

                                            var oIconTabBar = me.byId("idIconTabBarInlineMode");
                                            oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                                            // if (arg === "IODLV" || arg === "IODET") {
                                            //     var oIconTabBarStyle = me.byId("itfDLVSCHED");
                                            //     oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));
                                            // }

                                            me.byId(arg + "Tab").getModel().getData().rows.forEach((row, index) => {
                                                me.byId(arg + "Tab").getModel().setProperty('/rows/' + index + '/EDITED', false);
                                            })

                                            me._dataMode = "READ";
                                            Common.closeProcessingDialog(me);
                                        }
                                    },
                                    error: function () {
                                        iNew++;
                                        // alert("Error");
                                        // if (iNew === aNewRows.length) Common.closeProcessingDialog(me);
                                    }
                                });
                            }, 100)
                        })

                        this.setRowReadMode(arg);
                        this.unLock();
                    }
                    else {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                    }
                }
                else if (aEditedRows.length > 0) {
                    if (this._validationErrors.length === 0) {
                        var entitySet = "/";
                        var oModel;

                        switch (arg) {
                            case "color":
                                entitySet = entitySet + "AttribSet";
                                oModel = me.getOwnerComponent().getModel("ZGW_3DERP_IOSTYLE_SRV");
                                oModel.setHeaders({ UPDTYP: "UPDATE" });
                                break;
                            case "process":
                                entitySet = entitySet + "ProcessSet";
                                oModel = me.getOwnerComponent().getModel("ZGW_3DERP_IOSTYLE_SRV");
                                break;
                            case "ioMatList":
                                entitySet = entitySet + "MainSet";
                                oModel = me.getOwnerComponent().getModel("ZGW_3DERP_IOMATLIST_SRV");
                                oModel.setHeaders({ UPDTYP: "MAIN" });
                                break;
                            case "IODLV":
                                entitySet = entitySet + "IODLVSet"
                                oModel = me.getOwnerComponent().getModel();
                                break;
                            case "IODET":
                                entitySet = entitySet + "IODETSet"
                                oModel = me.getOwnerComponent().getModel();
                                break;
                            case "costHdr":
                                entitySet = entitySet + "VersionsSet";
                                oModel = this._oModelIOCosting;
                                break;
                            case "costDtls":
                                entitySet = entitySet + "DetailsSet";
                                oModel = this._oModelIOCosting;
                                break;
                            default:
                                break;
                        }

                        oModel.setUseBatch(true);
                        oModel.setDeferredGroups(["update"]);

                        var mParameters = {
                            "groupId": "update"
                        }

                        var centitySet = entitySet;

                        Common.openProcessingDialog(me, "Processing...");

                        aEditedRows.forEach(item => {
                            entitySet = centitySet + "(";
                            var param = {};
                            var iKeyCount = this._aColumns[arg].filter(col => col.Key === "X").length;
                            var itemValue;
                            // console.log(this._aColumns[arg])
                            this._aColumns[arg].forEach(col => {
                                if (arg === "costHdr" && col.DataType === "DATETIME") itemValue = sapDateFormat.format(new Date(item[col.ColumnName])) + "T00:00:00"
                                //SET FORMAT OF DATE ALIGNED TO ABAP WHEN CREATING PAYLOAD
                                else if (col.DataType === "DATETIME") {
                                    itemValue = sapDateFormat.format(new Date(item[col.ColumnName]));
                                } else {
                                    itemValue = item[col.ColumnName];
                                }

                                //IF IODLV || IODET, INCLUDE KEYS IN PAYLOAD 
                                if (arg === "IODLV" || arg === "IODET") {
                                    param[col.ColumnName] = itemValue;
                                }
                                //COLLECT EDITABLE FIELDS ONLY FOR OTHER ARG VALUE
                                else {
                                    if (col.Editable) {
                                        param[col.ColumnName] = itemValue;
                                    }
                                }

                                if (iKeyCount === 1) {
                                    if (col.Key === "X")
                                        entitySet += "'" + item[col.ColumnName] + "'"
                                }
                                else if (iKeyCount > 1) {
                                    if (col.Key === "X") {
                                        entitySet += col.ColumnName + "='" + item[col.ColumnName] + "',"
                                    }
                                }
                            })

                            if (iKeyCount > 1) entitySet = entitySet.substring(0, entitySet.length - 1);
                            entitySet += ")";

                            // console.log(entitySet);
                            // console.log(param);
                            oModel.update(entitySet, param, mParameters);
                        })

                        oModel.submitChanges({
                            groupId: "update",
                            success: function (oData, oResponse) {
                                MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);

                                if (arg === "color") {
                                    me.byId("btnEditColor").setVisible(true);
                                    me.byId("btnSaveColor").setVisible(false);
                                    me.byId("btnCancelColor").setVisible(false);
                                    me.byId("btnRefreshColor").setVisible(true);
                                }
                                else if (arg === "process") {
                                    me.byId("btnEditProcess").setVisible(true);
                                    me.byId("btnSaveProcess").setVisible(false);
                                    me.byId("btnCancelProcess").setVisible(false);
                                    me.byId("btnRefreshProcess").setVisible(true);
                                }
                                else if (arg === "ioMatList") {
                                    me.byId("btnSubmitMRP").setVisible(true);
                                    me.byId("btnAssignMatNo").setVisible(true);
                                    me.byId("btnEditIOMatList").setVisible(true);
                                    me.byId("btnRefreshIOMatList").setVisible(true);
                                    me.byId("btnExportIOMatList").setVisible(true);
                                    me.byId("btnSaveIOMatList").setVisible(false);
                                    me.byId("btnCancelIOMatList").setVisible(false);
                                    me.byId("btnReorderIOMatList").setVisible(true);
                                    me.byId("btnDeleteIOMatList").setVisible(true);
                                    me.byId("btnTabLayoutIOMatList").setVisible(true);
                                }
                                else if (arg === "IODLV") {
                                    me.byId("btnNewDlvSched").setVisible(true);
                                    me.byId("btnImportPODlvSched").setVisible(true);
                                    me.byId("btnEditDlvSched").setVisible(true);
                                    me.byId("btnDeleteDlvSched").setVisible(true);
                                    me.byId("btnCopyDlvSched").setVisible(true);
                                    me.byId("btnRefreshDlvSched").setVisible(true);
                                    me.byId("btnGenMatList").setVisible(true);
                                    me.byId("btnSaveDlvSched").setVisible(false);
                                    me.byId("btnCancelDlvSched").setVisible(false);
                                    me.byId("btnFullScreenDlvSched").setVisible(true);

                                    me.byId("btnNewIODet").setVisible(true);
                                    me.byId("btnEditIODet").setVisible(true);
                                    // me.byId("btnDeleteIODet").setVisible(true);
                                    // me.byId("btnCopyIODet").setVisible(true);
                                    me.byId("btnRefreshIODet").setVisible(true);
                                    me.byId("btnSaveIODet").setVisible(false);
                                    me.byId("btnCancelIODet").setVisible(false);
                                    me.byId("btnFullScreenIODet").setVisible(true);
                                }
                                else if (arg === "IODET") {
                                    me.byId("btnNewDlvSched").setVisible(true);
                                    me.byId("btnImportPODlvSched").setVisible(true);
                                    me.byId("btnEditDlvSched").setVisible(true);
                                    me.byId("btnDeleteDlvSched").setVisible(true);
                                    me.byId("btnCopyDlvSched").setVisible(true);
                                    me.byId("btnRefreshDlvSched").setVisible(true);
                                    me.byId("btnGenMatList").setVisible(true);
                                    me.byId("btnSaveDlvSched").setVisible(false);
                                    me.byId("btnCancelDlvSched").setVisible(false);
                                    me.byId("btnFullScreenDlvSched").setVisible(true);

                                    me.byId("btnNewIODet").setVisible(true);
                                    me.byId("btnEditIODet").setVisible(true);
                                    // me.byId("btnDeleteIODet").setVisible(true);
                                    // me.byId("btnCopyIODet").setVisible(true);
                                    me.byId("btnRefreshIODet").setVisible(true);
                                    me.byId("btnSaveIODet").setVisible(false);
                                    me.byId("btnCancelIODet").setVisible(false);
                                    me.byId("btnFullScreenIODet").setVisible(true);
                                }
                                else if (arg === "costHdr") {
                                    me.byId("btnNewCostHdr").setVisible(true);
                                    me.byId("btnEditCostHdr").setVisible(true);
                                    me.byId("btnRefreshCostHdr").setVisible(true);
                                    me.byId("btnSaveCostHdr").setVisible(false);
                                    me.byId("btnCancelCostHdr").setVisible(false);

                                    me.byId("btnEditCostDtl").setEnabled(true);
                                    me.byId("btnPrintCosting").setEnabled(true);
                                    me.byId("btnReleaseCosting").setEnabled(true);
                                    me.byId("btnRefreshCostDtl").setEnabled(true);
                                }
                                else if (arg === "costDtls") {
                                    me.byId("btnEditCostDtl").setVisible(true);
                                    me.byId("btnPrintCosting").setVisible(true);
                                    me.byId("btnReleaseCosting").setVisible(true);
                                    me.byId("btnRefreshCostDtl").setVisible(true);
                                    me.byId("btnSaveCostDtl").setVisible(false);
                                    me.byId("btnCancelCostDtl").setVisible(false);

                                    me.byId("btnNewCostHdr").setEnabled(true);
                                    me.byId("btnEditCostHdr").setEnabled(true);
                                    me.byId("btnRefreshCostHdr").setEnabled(true);
                                }

                                // if (arg !== "IODET")
                                me.setActiveRowHighlightByTableId(arg + "Tab");

                                if (arg === "color" || arg === "process") {
                                    var oIconTabBarStyle = me.byId("itbStyleDetail");
                                    oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));
                                }

                                var oIconTabBar = me.byId("idIconTabBarInlineMode");
                                oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                                me.byId(arg + "Tab").getModel().getData().rows.forEach((row, index) => {
                                    me.byId(arg + "Tab").getModel().setProperty('/rows/' + index + '/EDITED', false);
                                })

                                me._dataMode = "READ";
                                Common.closeProcessingDialog(me);
                                me.setRowReadMode(arg);
                                me.unLock();

                                if (arg === "color" || arg === "process" || arg === "ioMatList" || arg === "costHdr" || arg === "costDtls") {
                                    if (me._aColFilters.length > 0) { me.setColumnFilters(arg + "Tab"); }
                                    if (me._aColSorters.length > 0) { me.setColumnSorters(arg + "Tab"); }
                                }
                            },
                            error: function () {
                                Common.closeProcessingDialog(me);
                                me.setRowReadMode(arg);
                                me.unLock();
                            }
                        })
                    }
                    else {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                    }
                }
                else {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_MODIFIED"]);
                }

                //reload data based on arguments
                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();
                switch (arg) {
                    case "IODLV":
                        await this.reloadIOData("IODLVTab", "/IODLVSet");
                        this._bIODLVChanged = false;
                        break;

                    case "IODET":
                        //RELOAD IO DETAIL DATA PER IO & DLVSEQ
                        await this.getIODynamicColumns("IODET", "ZERP_IODET", "IODETTab", oColumns);


                        //RELOAD IO DELIVERY DATA PER IO
                        await this.reloadIOData("IODLVTab", "/IODLVSet");
                        this._bIODLVChanged = false;

                        break;

                    case "IOATTRIB":
                        await this.reloadIOData("IOATTRIBTab", "/IOATTRIBSet");
                        this._bIOATTRIBChanged = false;
                        break;

                    default: break;
                }
            },

            setRowEditMode(arg) {
                var oTable = this.byId(arg + "Tab");
                var me = this;

                oTable.getColumns().forEach((col, idx) => {
                    var sColName = "";
                    var oValueHelp = false;

                    // console.log("a2 ");

                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }
                    // console.log(col.mAggregations.template.mBindingInfos);
                    // console.log(this._aColumns[arg]);
                    // console.log("Columne Name " + sColName);

                    // this._aColumns[arg].filter(item => item.ColumnName === sColName)
                    //     .forEach(ci => {
                    //         if (ci.Editable) {
                    //             // console.log(ci.ColumnLabel + " | " + ci.DataType);
                    //             console.log(ci);
                    //             if (ci.ValueHelp !== undefined) oValueHelp = ci.ValueHelp["show"];
                    //             console.log(oValueHelp);

                    //             if (ci.DataType === "STRING") {
                    //                 console.log("a3 String " + sColName);
                    //                 col.setTemplate(new sap.m.Input({
                    //                     type: "Text",
                    //                     value: "{" + sColName + "}",
                    //                     maxLength: ci.Length,
                    //                     change: this.onInputLiveChange.bind(this)
                    //                 }));
                    //             } else if (ci.DataType === "NUMBER") {
                    //                 console.log("a3 NUMBER " + sColName);
                    //                 col.setTemplate(new sap.m.Input({
                    //                     type: sap.m.InputType.Number,
                    //                     textAlign: sap.ui.core.TextAlign.Right,
                    //                     value: "{path:'" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}",
                    //                     change: this.onNumberChange.bind(this)
                    //                 }));
                    //             } else if (ci.DataType === "DATETIME") {
                    //                 console.log("a3 Datetime " + sColName);
                    //                 col.setTemplate(new sap.m.DatePicker({
                    //                     // id: "ipt" + ci.name,
                    //                     value: "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                    //                     displayFormat: "short",
                    //                     change: this.onInputLiveChange.bind(this)
                    //                     // change: "handleChange"
                    //                     // ,liveChange: this.onInputLiveChange.bind(this)
                    //                 }));
                    //             }
                    //         }
                    //     })

                    this._aColumns[arg].filter(item => item.ColumnName === sColName)
                        .forEach(ci => {
                            if (ci.Editable) {
                                if (ci.ValueHelp !== undefined) oValueHelp = ci.ValueHelp["show"];

                                if (oValueHelp) {
                                    // console.log(oValueHelp);
                                    // console.log(arg);
                                    if (arg === "costHdr") {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            showValueHelp: true,
                                            valueHelpRequest: this.handleValueHelp.bind(this),
                                            showSuggestion: true,
                                            maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                            suggestionItems: {
                                                path: ci.ValueHelp["SuggestionItems"].path,
                                                length: 10000,
                                                template: new sap.ui.core.ListItem({
                                                    key: ci.ValueHelp["SuggestionItems"].text,
                                                    text: ci.ValueHelp["SuggestionItems"].text,
                                                    additionalText: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '',
                                                }),
                                                templateShareable: false
                                            },
                                            change: this.handleValueHelpChange.bind(this),
                                            enabled: {
                                                path: "COSTSTATUS",
                                                formatter: function (COSTSTATUS) {
                                                    if (COSTSTATUS === "REL") { return false }
                                                    else { return true }
                                                }
                                            }
                                        }));
                                    }
                                    else if (arg === "ioMatList") {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: arg === "IODET" ? "{DataModel>" + sColName + "}" : "{" + sColName + "}",
                                            showValueHelp: true,
                                            valueHelpRequest: this.handleValueHelp.bind(this),
                                            showSuggestion: true,
                                            maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                            suggestionItems: {
                                                path: ci.ValueHelp["SuggestionItems"].path,
                                                length: 10000,
                                                template: new sap.ui.core.ListItem({
                                                    key: ci.ValueHelp["SuggestionItems"].text,
                                                    text: ci.ValueHelp["SuggestionItems"].text,
                                                    additionalText: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '',
                                                }),
                                                templateShareable: false
                                            },
                                            // suggest: this.handleSuggestion.bind(this),
                                            change: this.handleValueHelpChange.bind(this),
                                            enabled: {
                                                path: "DELETED",
                                                formatter: function (DELETED) {
                                                    if (DELETED) { return false }
                                                    else { return true }
                                                }
                                            }
                                        }));
                                    }
                                    else if (arg === "IODET") {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: arg === "IODET" ? "{DataModel>" + sColName + "}" : "{" + sColName + "}",
                                            showValueHelp: true,
                                            valueHelpRequest: this.handleValueHelp.bind(this),
                                            showSuggestion: true,
                                            maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                            suggestionItems: {
                                                path: ci.ValueHelp["SuggestionItems"].path,
                                                length: 10000,
                                                template: new sap.ui.core.ListItem({
                                                    key: ci.ValueHelp["SuggestionItems"].text,
                                                    text: ci.ValueHelp["SuggestionItems"].text,
                                                    additionalText: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '',
                                                }),
                                                templateShareable: false
                                            },
                                            // suggest: this.handleSuggestion.bind(this),
                                            change: this.handleValueHelpChange.bind(this),
                                            enabled: {
                                                path: "DataModel>New",
                                                formatter: function (New) {
                                                    if (New === true || me._dataMode === "EDIT") { return true }
                                                    else { return false }
                                                }
                                            }
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: arg === "IODET" ? "{DataModel>" + sColName + "}" : "{" + sColName + "}",
                                            showValueHelp: true,
                                            valueHelpRequest: this.handleValueHelp.bind(this),
                                            showSuggestion: true,
                                            maxSuggestionWidth: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].maxSuggestionWidth : "1px",
                                            suggestionItems: {
                                                path: ci.ValueHelp["SuggestionItems"].path,
                                                length: 10000,
                                                template: new sap.ui.core.ListItem({
                                                    key: ci.ValueHelp["SuggestionItems"].text,
                                                    text: ci.ValueHelp["SuggestionItems"].text,
                                                    additionalText: ci.ValueHelp["SuggestionItems"].additionalText !== undefined ? ci.ValueHelp["SuggestionItems"].additionalText : '',
                                                }),
                                                templateShareable: false
                                            },
                                            // suggest: this.handleSuggestion.bind(this),
                                            change: this.handleValueHelpChange.bind(this)
                                        }));
                                    }
                                }
                                else if (ci.DataType === "DATETIME") {
                                    if (arg === "costHdr" && sColName === "CSDATE") {
                                        col.setTemplate(new sap.m.DatePicker({
                                            value: "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                                            displayFormat: "short",
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "COSTSTATUS",
                                                formatter: function (COSTSTATUS) {
                                                    if (COSTSTATUS === "REL") { return false }
                                                    else { return true }
                                                }
                                            }
                                        }));
                                    }
                                    else if (arg === "ioMatList") {
                                        col.setTemplate(new sap.m.DatePicker({
                                            value: "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                                            displayFormat: "short",
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "DELETED",
                                                formatter: function (DELETED) {
                                                    if (DELETED) { return false }
                                                    else { return true }
                                                }
                                            }
                                        }));
                                    }
                                    else if (arg === "IODET") {
                                        col.setTemplate(new sap.m.DatePicker({
                                            value: arg === "IODET" ? "{path: 'DataModel>" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}" : "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                                            displayFormat: "short",
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "DataModel>New",
                                                formatter: function (New) {
                                                    if (New === true || me._dataMode === "EDIT") { return true }
                                                    else { return false }
                                                }
                                            }
                                        }));
                                    }
                                    else if (arg === "IODLV") {
                                        col.setTemplate(new sap.m.DatePicker({
                                            value: "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                                            displayFormat: "short",
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "DELETED",
                                                formatter: function (DELETED) {
                                                    if (DELETED) { return false }
                                                    else { return true }
                                                }
                                            }
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.DatePicker({
                                            value: arg === "IODET" ? "{path: 'DataModel>" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}" : "{path: '" + ci.ColumnName + "', mandatory: '" + ci.Mandatory + "'}",
                                            displayFormat: "short",
                                            change: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }
                                else if (ci.DataType === "NUMBER") {
                                    // console.log("a3 NUMBER " + sColName);
                                    if (arg === "ioMatList") {
                                        col.setTemplate(new sap.m.Input({
                                            type: sap.m.InputType.Number,
                                            textAlign: sap.ui.core.TextAlign.Right,
                                            value: arg === "IODET" ? "{path:'DataModel>" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}" : "{path:'" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}",
                                            // change: this.onNumberChange.bind(this),
                                            change: this.onNumberLiveChange.bind(this),
                                            enabled: {
                                                path: "DELETED",
                                                formatter: function (DELETED) {
                                                    if (DELETED) { return false }
                                                    else { return true }
                                                }
                                            }
                                        }));
                                    }
                                    else if (arg === "IODET") {
                                        col.setTemplate(new sap.m.Input({
                                            type: sap.m.InputType.Number,
                                            textAlign: sap.ui.core.TextAlign.Right,
                                            value: arg === "IODET" ? "{path:'DataModel>" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}" : "{path:'" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}",
                                            // change: this.onNumberChange.bind(this),
                                            change: this.onNumberLiveChange.bind(this),
                                            enabled: {
                                                path: "DataModel>New",
                                                formatter: function (New) {
                                                    if (New === true || me._dataMode === "EDIT") { return true }
                                                    else { return false }
                                                }
                                            }
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            type: sap.m.InputType.Number,
                                            textAlign: sap.ui.core.TextAlign.Right,
                                            value: arg === "IODET" ? "{path:'DataModel>" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}" : "{path:'" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}",
                                            change: this.onNumberChange.bind(this)
                                        }));
                                    }
                                }
                                else if (ci.DataType === "BOOLEAN") {
                                    if (arg === "IODET") {
                                        col.setTemplate(new sap.m.Input({
                                            type: sap.m.Checkbox,
                                            textAlign: sap.ui.core.TextAlign.Right,
                                            value: arg === "IODET" ? "{path:'DataModel>" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}" : "{path:'" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}",
                                            change: this.onNumberChange.bind(this),
                                            enabled: {
                                                path: "DataModel>New",
                                                formatter: function (New) {
                                                    if (New === true || me._dataMode === "EDIT") { return true }
                                                    else { return false }
                                                }
                                            }
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            type: sap.m.Checkbox,
                                            textAlign: sap.ui.core.TextAlign.Right,
                                            value: arg === "IODET" ? "{path:'DataModel>" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}" : "{path:'" + sColName + "', formatOptions:{ minFractionDigits:" + ci.Decimal + ", maxFractionDigits:" + ci.Decimal + " }, constraints:{ precision:" + ci.Length + ", scale:" + ci.Decimal + " }}",
                                            change: this.onNumberChange.bind(this)
                                        }));
                                    }
                                }
                                else {
                                    if (arg === "ioMatList") {
                                        if (sColName === "MATDESC1") {
                                            col.setTemplate(new sap.m.Input({
                                                type: "Text",
                                                value: "{" + sColName + "}",
                                                maxLength: ci.Length,
                                                change: this.onInputLiveChange.bind(this),
                                                enabled: {
                                                    parts: [
                                                        { path: 'MATNO' },
                                                        { path: 'DELETED' }
                                                    ],
                                                    formatter: function (MATNO, DELETED) {
                                                        if (MATNO !== "" || DELETED) { return false }
                                                        else { return true }
                                                    }
                                                }
                                            }));
                                        }
                                        else {
                                            col.setTemplate(new sap.m.Input({
                                                type: "Text",
                                                value: "{" + sColName + "}",
                                                maxLength: ci.Length,
                                                change: this.onInputLiveChange.bind(this),
                                                enabled: {
                                                    path: "DELETED",
                                                    formatter: function (DELETED) {
                                                        if (DELETED) { return false }
                                                        else { return true }
                                                    }
                                                }
                                            }));
                                        }
                                    }
                                    else if (arg === "costHdr" && sColName === "VERDESC") {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "COSTSTATUS",
                                                formatter: function (COSTSTATUS) {
                                                    if (COSTSTATUS === "REL") { return false }
                                                    else { return true }
                                                }
                                            }
                                        }));
                                    }
                                    else if (arg === "IODET") {
                                        // console.log("IODET");
                                        // console.log(sColName);

                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{DataModel>" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this),
                                            enabled: {
                                                path: "DataModel>New",
                                                formatter: function (New) {
                                                    if (New === true || me._dataMode === "EDIT") { return true }
                                                    else { return false }
                                                }
                                            }
                                        }));
                                    }
                                    else {
                                        col.setTemplate(new sap.m.Input({
                                            type: "Text",
                                            value: "{" + sColName + "}",
                                            maxLength: ci.Length,
                                            change: this.onInputLiveChange.bind(this)
                                        }));
                                    }
                                }
                            }

                            if (ci.Mandatory) {
                                col.getLabel().addStyleClass("sapMLabelRequired");
                            }
                        })
                })

                // console.log("setRowEditMode 2");

                if (arg === "IODLV") {
                    this._oModel.read('/BILLTOvhSet', {
                        success: function (oData, response) {
                            oData.results.forEach(item => {
                                item.KUNNR = item.KUNNR
                            })
                            // console.log(oData);
                            // console.log("IODET_MODEL");
                            me.getView().setModel(new JSONModel(oData.results), "BILLTO_MODEL");
                        },
                        error: function (err) { }
                    })

                    this._oModel.read('/SHIPTOvhSet', {
                        success: function (oData, response) {
                            oData.results.forEach(item => {
                                item.KUNNR = item.KUNNR
                            })
                            // console.log(oData);
                            // console.log("IODET_MODEL");
                            me.getView().setModel(new JSONModel(oData.results), "SHIPTO_MODEL");
                        },
                        error: function (err) { }
                    })

                    this._oModel.read('/SOLDTOvhSet', {
                        success: function (oData, response) {
                            oData.results.forEach(item => {
                                item.KUNNR = item.KUNNR
                            })
                            // console.log(oData);
                            // console.log("IODET_MODEL");
                            me.getView().setModel(new JSONModel(oData.results), "SOLDTO_MODEL");
                        },
                        error: function (err) { }
                    })
                }

                if (arg === "IODET") {
                    var cIONo = this.getView().getModel("ui2").getProperty("/currIONo");
                    this._oModel.read('/IOCUSTCOLORSet', {
                        urlParameters: {
                            "$filter": "IONO eq '" + cIONo + "' and ATTRIBTYP eq 'COLOR'"
                        },
                        success: function (oData, response) {
                            // console.log(oData);
                            // console.log("IODET_MODEL");
                            me.getView().setModel(new JSONModel(oData.results), "IOCUSTCOLOR_MODEL");
                        },
                        error: function (err) { }
                    })
                }

                var vIONo = this.getView().getModel("ui2").getProperty("/currIONo");

                if (arg === "color") {
                    this._oModelStyle.read('/CustColorSet', {
                        urlParameters: {
                            "$filter": "IONO eq '" + vIONo + "'"
                        },
                        success: function (oData, response) {
                            me.getView().setModel(new JSONModel(oData.results), "CUSTCOLOR_MODEL");
                        },
                        error: function (err) { }
                    })
                }

                if (arg === "process") {
                    this._oModelStyle.read('/AttribTypeSet', {
                        urlParameters: {
                            "$filter": "IONO eq '" + vIONo + "'"
                        },
                        success: function (oData, response) {
                            me.getView().setModel(new JSONModel(oData.results), "ATTRIBTYPE_MODEL");
                        },
                        error: function (err) { }
                    })

                    var mVASTypeData = {}, mAttribCodeData = {};
                    var iCounter1 = 0, iCounter2 = 0;
                    var oTabData = this.byId(arg + "Tab").getModel().getData().rows;

                    oTabData.forEach(item => {
                        this._oModelStyle.read('/VASTypeSet', {
                            urlParameters: {
                                "$filter": "PROCESSCD eq '" + item.PROCESSCD + "'"
                            },
                            success: function (oData, response) {
                                iCounter1++;
                                mVASTypeData[item.PROCESSCD] = oData.results;

                                if (iCounter1 === oTabData.length) {
                                    me.getView().setModel(new JSONModel(mVASTypeData), "VASTYPE_MODEL");
                                }
                            },
                            error: function (err) {
                                iCounter1++;
                            }
                        })

                        this._oModelStyle.read('/AttribCodeSet', {
                            urlParameters: {
                                "$filter": "IONO eq '" + vIONo + "' and ATTRIBTYP eq '" + item.ATTRIBTYP + "'"
                            },
                            success: function (oData, response) {
                                iCounter2++;
                                mAttribCodeData[item.PROCESSCD] = oData.results;

                                if (iCounter2 === oTabData.length) {
                                    me.getView().setModel(new JSONModel(mAttribCodeData), "ATTRIBCODE_MODEL");
                                }
                            },
                            error: function (err) {
                                iCounter2++;
                            }
                        })
                    })
                }

                if (arg === "costHdr") {
                    this._oModelIOCosting.read('/TypeSHSet', {
                        success: function (oData) {
                            me.getView().setModel(new JSONModel(oData.results), "COSTTYPE_MODEL");
                        },
                        error: function (err) { }
                    })

                    this._oModelIOCosting.read('/SalesTermSet', {
                        success: function (oData) {
                            me.getView().setModel(new JSONModel(oData.results), "COSTTERMS_MODEL");
                        },
                        error: function (err) { }
                    })

                    this._oModelIOCosting.setHeaders({
                        PRODPLANT: this._prodplant
                    })
                    this._oModelIOCosting.read('/VariantSHSet', {
                        success: function (oData) {
                            me.getView().setModel(new JSONModel(oData.results), "COSTVARIANT_MODEL");
                        },
                        error: function (err) { }
                    })
                }
                // console.log("setRowEditMode 3");
            },

            setRowReadMode(arg) {
                var oTable = this.byId(arg + "Tab");
                var sColName = "";

                // this._validationErrors = [];

                oTable.getColumns().forEach((col, idx) => {
                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.value !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.value.parts[0].path;
                    }

                    if (arg === "IODLV" || arg === "IODET" || arg === "IOATTRIB") {
                        this._aColumns[arg].filter(item => item.ColumnName === sColName)
                            .forEach(ci => {
                                if (ci.DataType === "STRING" || ci.DataType === "DATETIME" || ci.DataType === "NUMBER") {
                                    col.setTemplate(new sap.m.Text({
                                        text: arg === "IODET" ? "{DataModel>/" + sColName + "}" : "{" + sColName + "}",
                                        wrapping: false
                                    }));
                                }
                                else if (ci.DataType === "BOOLEAN") {
                                    col.setTemplate(new sap.m.CheckBox({
                                        selected: arg === "IODET" ? "{DataModel>/" + sColName + "}" : "{" + sColName + "}",
                                        // text: arg === "IODET" ? "{DataModel>/" + sColName + "}" : "{" + sColName + "}",
                                        wrapping: false,
                                        editable: false
                                    }));
                                }
                            })
                    } else {
                        this._aColumns[arg].filter(item => item.ColumnName === sColName)
                            .forEach(ci => {
                                if (ci.DataType === "STRING" || ci.DataType === "DATETIME" || ci.DataType === "NUMBER") {
                                    col.setTemplate(new sap.m.Text({
                                        text: arg === "IODET" ? "{DataModel>/" + sColName + "}" : "{" + sColName + "}",
                                        wrapping: false,
                                        tooltip: arg === "IODET" ? "{DataModel>/" + sColName + "}" : "{" + sColName + "}"
                                    }));
                                }
                                else if (ci.DataType === "BOOLEAN") {
                                    col.setTemplate(new sap.m.CheckBox({
                                        selected: arg === "IODET" ? "{DataModel>/" + sColName + "}" : "{" + sColName + "}",
                                        wrapping: false,
                                        editable: false
                                    }));
                                }
                            })
                    }

                    col.getLabel().removeStyleClass("sapMLabelRequired");
                })
            },

            onNumberInputLiveChange: function (oEvent) {
                if (this._validationErrors === undefined) this._validationErrors = [];
                var oSource = oEvent.getSource();
                // console.log(oSource);
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                // console.log(sModel);
                // var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                // console.log(oSource.getBindingInfo("value").parts[0].path);
                var vDecPlaces = 0;
                var bError = false;

                var sUOM = this.getView().getModel("headerData").getData()["BASEUOM"];
                var iUOMDec = 0;

                this.getView().getModel("UOMINFOModel").getData().results.filter(fItem => fItem.MSEHI === sUOM)
                    .forEach((item) => {
                        // console.log(item.MSEHI);
                        iUOMDec = item.ANDEC;
                    })

                if (oSource.getBindingInfo("value").parts[0].path === "/ACTUALQTY"
                    || oSource.getBindingInfo("value").parts[0].path === "/ORDQTY"
                    || oSource.getBindingInfo("value").parts[0].path === "/REVORDQTY") {
                    vDecPlaces = iUOMDec;
                } else {
                    // console.log("Number ELSE");
                    vDecPlaces = iUOMDec;
                }

                if (oEvent.getParameters().value.split(".").length > 1) {
                    if (vDecPlaces === 0) {
                        // MessageBox.information("Value should not have decimal place/s.");
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Value should not have decimal place/s.");
                        // console.log("Error Value should not have decimal place/s." + oEvent.getSource().getId());
                        this._validationErrors.push(oEvent.getSource().getId());
                        bError = true;
                    }
                    else {
                        if (oEvent.getParameters().value.split(".")[1].length > vDecPlaces) {
                            oEvent.getSource().setValueState("Error");
                            oEvent.getSource().setValueStateText("Enter a number with a maximum decimal places: " + vDecPlaces.toString());
                            this._validationErrors.push(oEvent.getSource().getId());
                            bError = true;
                        }
                        else {
                            oEvent.getSource().setValueState("None");
                            this._validationErrors.forEach((item, index) => {
                                if (item === oEvent.getSource().getId()) {
                                    // console.log(this._validationErrors);
                                    // console.log("Splice " + oEvent.getSource().getId());
                                    this._validationErrors.splice(index, 1)
                                    // console.log(this._validationErrors);
                                }
                            })
                            bError = false;
                        }
                    }
                }
                else {
                    oEvent.getSource().setValueState("None");
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            // console.log(this._validationErrors);
                            // console.log("Splice " + oEvent.getSource().getId());
                            this._validationErrors.splice(index, 1)
                            // console.log(this._validationErrors);
                        }
                    })
                    bError = false;
                }
            },

            onNumberLiveChange: function (oEvent) {
                if (this._validationErrors === undefined) this._validationErrors = [];
                // console.log("ok")
                var oSource = oEvent.getSource();
                var sModel = oSource.getBindingInfo("value").parts[0].model;
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var vDecPlaces = 0;
                var bError = false;
                var bNegative = false;

                var sUOM = this.getView().getModel("headerData").getData()["BASEUOM"];
                var iUOMDec = 0;
                // console.log(sUOM);

                // console.log(this.getView().getModel("UOMINFOModel").getData());
                this.getView().getModel("UOMINFOModel").getData().results.filter(fItem => fItem.MSEHI === sUOM)
                    .forEach((item) => {
                        // console.log(item.MSEHI);
                        iUOMDec = item.ANDEC;
                    })

                if (oSource.getBindingInfo("value").parts[0].path === "BASEPOQTY") {
                    vDecPlaces = this.getView().getModel(sModel).getProperty(sRowPath + "/ANDEC");
                }
                else if (oSource.getBindingInfo("value").parts[0].path === "UNITPRICE"
                    || oSource.getBindingInfo("value").parts[0].path === "GROSSPRICE"
                    || oSource.getBindingInfo("value").parts[0].path === "UNITPRICE1"
                    || oSource.getBindingInfo("value").parts[0].path === "UNITPRICE2"
                    || oSource.getBindingInfo("value").parts[0].path === "UNITPRICE3"
                    || oSource.getBindingInfo("value").parts[0].path === "REVUNITPRICE1"
                    || oSource.getBindingInfo("value").parts[0].path === "REVUNITPRICE2"
                    || oSource.getBindingInfo("value").parts[0].path === "REVUNITPRICE3") {
                    vDecPlaces = 4;
                }
                else {
                    // console.log("Number ELSE");
                    vDecPlaces = iUOMDec;
                }

                if (oEvent.getParameters().value.split(".").length > 1) {
                    if (vDecPlaces === 0) {
                        // MessageBox.information("Value should not have decimal place/s.");
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Value should not have decimal place/s.");
                        // console.log("1 Error Value should not have decimal place/s." + oEvent.getSource().getId());
                        this._validationErrors.push(oEvent.getSource().getId());
                        bError = true;
                    }
                    else {
                        if (oEvent.getParameters().value.split(".")[1].length > vDecPlaces) {
                            oEvent.getSource().setValueState("Error");
                            oEvent.getSource().setValueStateText("Enter a number with a maximum decimal places: " + vDecPlaces.toString());
                            this._validationErrors.push(oEvent.getSource().getId());
                            bError = true;
                        }
                        else {
                            oEvent.getSource().setValueState("None");
                            // console.log("3 None");
                            this._validationErrors.forEach((item, index) => {
                                if (item === oEvent.getSource().getId()) {
                                    this._validationErrors.splice(index, 1)
                                }
                            })
                            bError = false;
                        }
                    }
                }
                else {
                    oEvent.getSource().setValueState("None");
                    // console.log("4 None");
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                    bError = false;
                }

                if (oEvent.getParameters().value < 0) {
                    oEvent.getSource().setValueState("Error");
                    oEvent.getSource().setValueStateText("Negative values are not allowed.");
                    this._validationErrors.push(oEvent.getSource().getId());
                    bNegative = true;
                }

                // this._bDetailsChanged = false;
                if (!bError) {
                    if (oEvent.getSource().getBindingInfo("value").parts[0].path === "BASEPOQTY") {
                        var sActiveGroup = this.getView().getModel("ui").getData().activeGroup;

                        this.getView().getModel("detail").getData().filter(fItem => fItem.GROUP === sActiveGroup)
                            .forEach((item, idx) => {
                                if (idx.toString() === sRowPath.replace("/", "")) {
                                    // console.log(item.BASEPOQTY)
                                    // console.log(oEvent.getParameters().value);
                                    item.BASEPOQTY = oEvent.getParameters().value;

                                    var sOrderConvFactor = item.ORDERCONVFACTOR === "" || item.ORDERCONVFACTOR === "0" ? "1" : item.ORDERCONVFACTOR;
                                    var sBaseConvFactor = item.BASECONVFACTOR === "" || item.BASECONVFACTOR === "0" ? "1" : item.BASECONVFACTOR;
                                    var sPer = item.PER === "" ? "1" : item.PER;
                                    var vComputedPOQty = +item.BASEPOQTY / ((+sOrderConvFactor) * (+sBaseConvFactor) * (+sPer));
                                    var vFinalPOQty = "0";

                                    if (item.ORDERUOMANDEC === 0) vFinalPOQty = Math.ceil(vComputedPOQty).toString();
                                    else vFinalPOQty = vComputedPOQty.toFixed(item.ORDERUOMANDEC);

                                    item.ORDERPOQTY = vFinalPOQty;
                                    this.byId("detailTab").getModel("detail").setProperty(sRowPath + '/ORDERPOQTY', vFinalPOQty);
                                    this.getPOTolerance(sRowPath, item);
                                }
                            })
                    }
                    else if (oEvent.getSource().getBindingInfo("value").parts[0].path === "GROSSPRICE") {
                        var sActiveGroup = this.getView().getModel("ui").getData().activeGroup;
                        var sRowPath = oEvent.getSource().getBindingInfo("value").binding.oContext.sPath

                        this.getView().getModel("detail").getData().filter(fItem => fItem.GROUP === sActiveGroup)
                            .forEach((item, idx) => {
                                if (idx.toString() === sRowPath.replace("/", "")) {
                                    // console.log(item.GROSSPRICE)
                                    item.GROSSPRICE = oEvent.getParameters().value;
                                    item.NETPRICE = item.GROSSPRICE;
                                    this.byId("detailTab").getModel("detail").setProperty(sRowPath + '/NETPRICE', item.GROSSPRICE);
                                }
                            })
                    }
                }

                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;

                if (this._sTableModel === "IODET") {
                    this.byId(this._sTableModel + "Tab").getModel("DataModel").setProperty(sRowPath + '/EDITED', true);
                }
                else if (this._sTableModel === "reorder") {
                    this._ReorderDialog.getModel().setProperty(sRowPath + '/EDITED', true);
                }
                else {
                    this.byId(this._sTableModel + "Tab").getModel().setProperty(sRowPath + '/EDITED', true);
                }

                if (this._sTableModel === "color") this._bColorChanged = true;
                else if (this._sTableModel === "process") this._bProcessChanged = true;
                else if (this._sTableModel === "ioMatList") this._bIOMatListChanged = true;
                else if (this._sTableModel === "IODLV") this._bIODETChanged = true;
                else if (this._sTableModel === "IODET") this._bIODETChanged = true;
                else if (this._sTableModel === "costHdr") this._bCostHdrChanged = true;
                else if (this._sTableModel === "costDtls") this._bCostDtlsChanged = true;
                else if (this._sTableModel === "reorder") this._bReorderChanged = true;

                // console.log("Table Model : " + this._sTableModel);
            },

            onNumberChange: function (oEvent) {
                if (this._validationErrors === undefined) this._validationErrors = [];
                // console.log(oEvent.getSource());

                var decPlaces = oEvent.getSource().getBindingInfo("value").constraints.scale;

                if (oEvent.getParameters().value.split(".").length > 1) {
                    if (oEvent.getParameters().value.split(".")[1].length > decPlaces) {
                        // console.log("invalid");
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Enter a number with a maximum of " + decPlaces + " decimal places.");
                        this._validationErrors.push(oEvent.getSource().getId());
                    }
                    else {
                        oEvent.getSource().setValueState("None");
                        this._validationErrors.forEach((item, index) => {
                            if (item === oEvent.getSource().getId()) {
                                this._validationErrors.splice(index, 1)
                            }
                        })
                    }
                }
                else {
                    oEvent.getSource().setValueState("None");
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }

                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;

                if (this._sTableModel === "IODET") {
                    this.byId(this._sTableModel + "Tab").getModel("DataModel").setProperty(sRowPath + '/EDITED', true);
                }
                else if (this._sTableModel === "reorder") {
                    this._ReorderDialog.getModel().setProperty(sRowPath + '/EDITED', true);
                }
                else {
                    this.byId(this._sTableModel + "Tab").getModel().setProperty(sRowPath + '/EDITED', true);
                }

                if (this._sTableModel === "color") this._bColorChanged = true;
                else if (this._sTableModel === "process") this._bProcessChanged = true;
                else if (this._sTableModel === "ioMatList") this._bIOMatListChanged = true;
                else if (this._sTableModel === "IODET") this._bIODETChanged = true;
                else if (this._sTableModel === "costHdr") this._bCostHdrChanged = true;
                else if (this._sTableModel === "costDtls") this._bCostDtlsChanged = true;
                else if (this._sTableModel === "reorder") this._bReorderChanged = true;
            },

            onInputLiveChange: function (oEvent) {
                var oSource = oEvent.getSource();
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                if (this._sTableModel === "IODET") {
                    this.byId(this._sTableModel + "Tab").getModel("DataModel").setProperty(sRowPath + '/EDITED', true);
                }
                else if (this._sTableModel === "reorder") {
                    this._ReorderDialog.getModel().setProperty(sRowPath + '/EDITED', true);
                }
                else {
                    this.byId(this._sTableModel + "Tab").getModel().setProperty(sRowPath + '/EDITED', true);
                }

                if (this._sTableModel === "color") this._bColorChanged = true;
                else if (this._sTableModel === "process") this._bProcessChanged = true;
                else if (this._sTableModel === "ioMatList") this._bIOMatListChanged = true;
                else if (this._sTableModel === "IODLV") this._bIODETChanged = true;
                else if (this._sTableModel === "IODET") this._bIODETChanged = true;
                else if (this._sTableModel === "costHdr") this._bCostHdrChanged = true;
                else if (this._sTableModel === "costDtls") this._bCostDtlsChanged = true;
                else if (this._sTableModel === "reorder") this._bReorderChanged = true;
            },

            handleValueHelp: function (oEvent) {
                var me = this;
                var oSource = oEvent.getSource();
                var sModel = this._sTableModel;

                this._inputSource = oSource;
                this._inputId = oSource.getId();
                this._inputValue = oSource.getValue();
                this._inputField = oSource.getBindingInfo("value").parts[0].path;

                var vColProp = this._aColumns[sModel].filter(item => item.ColumnName === this._inputField);
                var vItemValue = vColProp[0].ValueHelp.items.value;
                var vItemDesc = vColProp[0].ValueHelp.items.text;
                var sPath = vColProp[0].ValueHelp.items.path;
                var vh = this.getView().getModel(sPath).getData();

                if (sModel === "process" && (this._inputField === "VASTYP" || this._inputField === "ATTRIBCD")) {
                    var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                    var sVasType = this.byId(sModel + "Tab").getModel().getProperty(sRowPath + "/PROCESSCD");
                    vh = this.getView().getModel(sPath).getData()[sVasType];
                }

                vh.forEach(item => {
                    item.VHTitle = item[vItemValue];
                    item.VHDesc = vItemValue === vItemDesc ? "" : item[vItemDesc];
                    item.VHSelected = (item[vItemValue] === this._inputValue);
                })

                vh.sort((a, b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                var oVHModel = new JSONModel({
                    items: vh,
                    title: vColProp[0].label,
                    table: sModel
                });

                // create value help dialog
                if (!this._valueHelpDialog) {
                    this._valueHelpDialog = sap.ui.xmlfragment(
                        "zuiio2.view.fragments.valuehelp.ValueHelpDialog",
                        this
                    );

                    this._valueHelpDialog.setModel(oVHModel);
                    this.getView().addDependent(this._valueHelpDialog);
                }
                else {
                    this._valueHelpDialog.setModel(oVHModel);
                }

                this._valueHelpDialog.open();
            },

            handleValueHelpClose: function (oEvent) {
                if (oEvent.sId === "confirm") {
                    if (oEvent.getSource().getModel().getData().process !== undefined) {
                        if (oEvent.getSource().getModel().getData().process === "CREATECOSTING") { this.handleValueHelpCloseCosting(oEvent); }
                        // else if (oEvent.getSource().getModel().getData().process === "REORDER") { this.handleReorderValueHelpClose(oEvent); }
                    }
                    else {
                        var oSelectedItem = oEvent.getParameter("selectedItem");

                        if (oSelectedItem) {
                            this._inputSource.setValue(oSelectedItem.getTitle());

                            if (this._inputValue !== oSelectedItem.getTitle()) {
                                var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;

                                if (this._sTableModel === "reorder") {
                                    this._ReorderDialog.getModel().setProperty(sRowPath + '/EDITED', true);
                                    this._ReorderDialog.getModel().setProperty(sRowPath + '/SEQNO', oSelectedItem.getDescription());

                                    var vUOM = "";
                                    var vANDEC = 0;

                                    this.getView().getModel("IOMATLIST_MODEL").getData().filter(fItem => fItem.SEQNO === oSelectedItem.getDescription()).forEach(item => vUOM = item.UOM);
                                    this.getView().getModel("UOMConfig").getData().filter(fItem => fItem.MSEHI === vUOM).forEach(item => vANDEC = item.ANDEC);
                                    // console.log(vUOM, vANDEC)
                                    this._ReorderDialog.getModel().setProperty(sRowPath + '/UOM', vUOM);
                                    this._ReorderDialog.getModel().setProperty(sRowPath + '/ANDEC', vANDEC);
                                }
                                else {
                                    this.byId(this._sTableModel + "Tab").getModel().setProperty(sRowPath + '/EDITED', true);
                                }

                                if (this._sTableModel === "color") this._bColorChanged = true;
                                else if (this._sTableModel === "process") this._bProcessChanged = true;
                                else if (this._sTableModel === "ioMatList") this._bIOMatListChanged = true;
                                else if (this._sTableModel === "costHdr") this._bCostHdrChanged = true;
                                else if (this._sTableModel === "costDtls") this._bCostDtlsChanged = true;
                                else if (this._sTableModel === "reorder") this._bReorderChanged = true;
                            }
                        }

                        this._inputSource.setValueState("None");
                    }
                }
            },

            handleValueHelpChange: function (oEvent) {
                var oSource = oEvent.getSource();
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                oSource.setValueState(isInvalid ? "Error" : "None");

                oSource.getSuggestionItems().forEach(item => {
                    if (item.getProperty("key") === oSource.getValue().trim()) {
                        isInvalid = false;
                        oSource.setValueState(isInvalid ? "Error" : "None");
                    }
                })

                if (isInvalid) this._validationErrors.push(oEvent.getSource().getId());
                else {
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }

                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;

                if (this.__sTableModel === "IODET") {
                    this.byId(this._sTableModel + "Tab").getModel("DataModel").setProperty(sRowPath + '/EDITED', true);
                }
                else if (this.__sTableModel === "reorder") {
                    this._ReorderDialog.getModel().setProperty(sRowPath + '/EDITED', true);
                }
                else {
                    this.byId(this._sTableModel + "Tab").getModel().setProperty(sRowPath + '/EDITED', true);
                }

                if (this._sTableModel === "color") this._bColorChanged = true;
                else if (this._sTableModel === "process") this._bProcessChanged = true;
                else if (this._sTableModel === "ioMatList") this._bIOMatListChanged = true;
                else if (this._sTableModel === "IODLV") this._bIODETChanged = true;
                else if (this._sTableModel === "IODET") this._bIODETChanged = true;
                else if (this._sTableModel === "costHdr") this._bCostHdrChanged = true;
                else if (this._sTableModel === "costDtls") this._bCostDtlsChanged = true;
                else if (this._sTableModel === "reorder") this._bReorderChanged = true;
            },

            handleSuggestion: function (oEvent) {
                var me = this;
                var oInput = oEvent.getSource();
                var sInputField = oInput.getBindingInfo("value").parts[0].path;

                if (sInputField === "CPOATRIB") {
                    // console.log(oInput.getSuggestionItems())
                    if (oInput.getSuggestionItems().length === 0) {
                        var oData = me.getView().getModel("CUSTCOLOR_MODEL").getData();
                        var sKey = "";
                        // console.log(oData);
                        if (sInputField === "CPOATRIB") {
                            sKey = "CUSTCOLOR";
                        }

                        oInput.bindAggregation("suggestionItems", {
                            path: "CUSTCOLOR_MODEL>/",
                            length: 10000,
                            template: new sap.ui.core.ListItem({
                                key: "{CUSTCOLOR_MODEL>" + sKey + "}",
                                text: "{CUSTCOLOR_MODEL>" + sKey + "}"
                            }),
                            templateShareable: false
                        });
                    }
                }
            },

            onCloseConfirmDialog: function (oEvent) {
                if (this._ConfirmDialog.getModel().getData().Action === "update-cancel") {
                    if (this._sTableModel === "reorder") {
                        var oTable = sap.ui.getCore().byId("reorderTab");
                        this._ReorderDialog.getModel().setProperty("/rowCount", this._aDataBeforeChange.length);
                        oTable.getModel().setProperty("/rows", this._aDataBeforeChange);
                        oTable.bindRows("/rows");

                        this.setReorderReadMode();
                        this.unLock();
                        this._dataMode = "READ";
                        sap.ui.getCore().byId("btnNewReorder").setVisible(true);
                        sap.ui.getCore().byId("btnEditReorder").setVisible(true);
                        sap.ui.getCore().byId("btnAddReorder").setVisible(false);
                        sap.ui.getCore().byId("btnSaveReorder").setVisible(false);
                        sap.ui.getCore().byId("btnCancelReorder").setVisible(false);
                        sap.ui.getCore().byId("btnCloseReorder").setVisible(true);
                        sap.ui.getCore().byId("btnDeleteReorder").setVisible(true);
                        sap.ui.getCore().byId("btnRefreshReorder").setVisible(true);
                    }
                    else {
                        if (this._sTableModel === "color") {
                            this.byId("btnEditColor").setVisible(true);
                            this.byId("btnSaveColor").setVisible(false);
                            this.byId("btnCancelColor").setVisible(false);
                            this.byId("btnRefreshColor").setVisible(true);
                        }
                        else if (this._sTableModel === "process") {
                            this.byId("btnEditProcess").setVisible(true);
                            this.byId("btnSaveProcess").setVisible(false);
                            this.byId("btnCancelProcess").setVisible(false);
                            this.byId("btnRefreshProcess").setVisible(true);
                        }
                        else if (this._sTableModel === "ioMatList") {
                            this.byId("btnSubmitMRP").setVisible(true);
                            this.byId("btnAssignMatNo").setVisible(true);
                            this.byId("btnEditIOMatList").setVisible(true);
                            this.byId("btnRefreshIOMatList").setVisible(true);
                            this.byId("btnExportIOMatList").setVisible(true);
                            this.byId("btnSaveIOMatList").setVisible(false);
                            this.byId("btnCancelIOMatList").setVisible(false);
                            this.byId("btnReorderIOMatList").setVisible(true);
                            this.byId("btnDeleteIOMatList").setVisible(true);
                            this.byId("btnTabLayoutIOMatList").setVisible(true);
                        } else if (this._sTableModel === "IODLV") {
                            this.byId("btnNewDlvSched").setVisible(true);
                            this.byId("btnImportPODlvSched").setVisible(true);
                            this.byId("btnEditDlvSched").setVisible(true);
                            this.byId("btnDeleteDlvSched").setVisible(true);
                            this.byId("btnCopyDlvSched").setVisible(true);
                            this.byId("btnRefreshDlvSched").setVisible(true);
                            this.byId("btnSaveDlvSched").setVisible(false);
                            this.byId("btnCancelDlvSched").setVisible(false);
                            this.byId("btnFullScreenDlvSched").setVisible(true);

                            this.byId("btnNewIODet").setVisible(true);
                            this.byId("btnEditIODet").setVisible(true);
                            // this.byId("btnDeleteIODet").setVisible(true);
                            // this.byId("btnCopyIODet").setVisible(true);
                            this.byId("btnRefreshIODet").setVisible(true);
                            this.byId("btnSaveIODet").setVisible(false);
                            this.byId("btnCancelIODet").setVisible(false);
                            this.byId("btnFullScreenIODet").setVisible(true);
                        } else if (this._sTableModel === "IODET") {
                            this.byId("btnNewDlvSched").setVisible(true);
                            this.byId("btnImportPODlvSched").setVisible(true);
                            this.byId("btnEditDlvSched").setVisible(true);
                            this.byId("btnDeleteDlvSched").setVisible(true);
                            this.byId("btnCopyDlvSched").setVisible(true);
                            this.byId("btnRefreshDlvSched").setVisible(true);
                            this.byId("btnSaveDlvSched").setVisible(false);
                            this.byId("btnCancelDlvSched").setVisible(false);
                            this.byId("btnFullScreenDlvSched").setVisible(true);

                            this.byId("btnNewIODet").setVisible(true);
                            this.byId("btnEditIODet").setVisible(true);
                            // this.byId("btnDeleteIODet").setVisible(true);
                            // this.byId("btnCopyIODet").setVisible(true);
                            this.byId("btnRefreshIODet").setVisible(true);
                            this.byId("btnSaveIODet").setVisible(false);
                            this.byId("btnCancelIODet").setVisible(false);
                            this.byId("btnFullScreenIODet").setVisible(true);
                        } else if (this._sTableModel === "IOATTRIB") {
                            this.byId("onIOAttribEdit").setVisible(true);
                            this.byId("onIOAttribSave").setVisible(false);
                            this.byId("onIOAttribCancel").setVisible(false);

                            this.byId("onIOEdit").setVisible(true);
                            this.byId("onIORelease").setVisible(true);
                        }
                        else if (this._sTableModel === "costHdr") {
                            this.byId("btnNewCostHdr").setVisible(true);
                            this.byId("btnEditCostHdr").setVisible(true);
                            this.byId("btnRefreshCostHdr").setVisible(true);
                            this.byId("btnSaveCostHdr").setVisible(false);
                            this.byId("btnCancelCostHdr").setVisible(false);

                            this.byId("btnEditCostDtl").setEnabled(true);
                            this.byId("btnPrintCosting").setEnabled(true);
                            this.byId("btnReleaseCosting").setEnabled(true);
                            this.byId("btnRefreshCostDtl").setEnabled(true);
                        }
                        else if (this._sTableModel === "costDtls") {
                            this.byId("btnEditCostDtl").setVisible(true);
                            this.byId("btnPrintCosting").setVisible(true);
                            this.byId("btnReleaseCosting").setVisible(true);
                            this.byId("btnRefreshCostDtl").setVisible(true);
                            this.byId("btnSaveCostDtl").setVisible(false);
                            this.byId("btnCancelCostDtl").setVisible(false);

                            this.byId("btnNewCostHdr").setEnabled(true);
                            this.byId("btnEditCostHdr").setEnabled(true);
                            this.byId("btnRefreshCostHdr").setEnabled(true);
                        }

                        this.setRowReadMode(this._sTableModel);
                        this.unLock();

                        if (this._sTableModel === "IODET") {
                            this.byId(this._sTableModel + "Tab").getModel("DataModel").setProperty("/results", this._aDataBeforeChange);
                            this.byId(this._sTableModel + "Tab").bindRows("/results");
                        } else {
                            this.byId(this._sTableModel + "Tab").getModel().setProperty("/rows", this._aDataBeforeChange);
                            this.byId(this._sTableModel + "Tab").bindRows("/rows");
                        }
                        this._dataMode = "READ";

                        if (this._sTableModel !== "IODET")
                            this.setActiveRowHighlightByTableId(this._sTableModel + "Tab");

                        var oIconTabBar = this.byId("idIconTabBarInlineMode");
                        oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));

                        if (this._sTableModel === "color" || this._sTableModel === "process") {
                            var oIconTabBarStyle = this.byId("itbStyleDetail");
                            oIconTabBarStyle.getItems().forEach(item => item.setProperty("enabled", true));
                        }

                        if (this._sTableModel === "color" || this._sTableModel === "process" || this._sTableModel === "ioMatList" || this._sTableModel === "costHdr" || this._sTableModel === "costDtls") {
                            if (this._aColFilters.length > 0) { this.setColumnFilters(this._sTableModel + "Tab"); }
                            if (this._aColSorters.length > 0) { this.setColumnSorters(this._sTableModel + "Tab"); }
                        }
                    }
                }
                else if (this._ConfirmDialog.getModel().getData().Action === "createcosting-cancel") {
                    this._CreateCostingDialog.close();
                }

                this._ConfirmDialog.close();
            },

            onCancelConfirmDialog: function (oEvent) {
                this._ConfirmDialog.close();
            },

            onManageStyle: function (oEvent) {
                var vStyle = this._styleNo;
                var me = this;
                let iono = me._ioNo.length > 0 ? me._ioNo : this.getView().getModel("ui2").getProperty("/currIONo");
                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

                var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                    target: {
                        semanticObject: "ZSO_3DERP_ORD_STYLE",
                        action: this.getView().getModel("ui").getProperty("/DisplayMode") + "&/RouteStyleDetail/" + vStyle + "/" + me._sbu + "/" + me._ioNo
                    }
                    // params: {
                    //     "styleno": vStyle,
                    //     "sbu": "VER"
                    // }
                })) || ""; // generate the Hash to display style

                oCrossAppNavigator.toExternal({
                    target: {
                        shellHash: hash
                    }
                }); // navigate to Supplier application

                this._routeToStyle = true;

                // sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then( function (oService) {
                //     oService.hrefForExternalAsync({
                //         target : {
                //             semanticObject: "ZUI_3DERP",
                //             action: "manage&/RouteStyleDetail/" + vStyle + "/" + me._sbu
                //         }
                //         // params: {
                //         //     "styleno": vStyle,
                //         //     "sbu": me._sbu
                //         // }
                //     }).then( function(sHref) {
                // ("test");
                //         console.log(sHref);
                //         // Place sHref somewhere in the DOM
                //     });
                //  });

            },

            onNewStyle: function (oEvent) {
                // var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                // oRouter.navTo("RouteStyles");
                // console.log()
                var me = this;
                var oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");
                var pIONO = me.getView().getModel("ui2").getProperty("/currIONo");

                var hash = (oCrossAppNavigator && oCrossAppNavigator.hrefForExternal({
                    target: {
                        semanticObject: "ZSO_3DERP_ORD_STYLE",
                        action: this.getView().getModel("ui").getProperty("/DisplayMode") + "&/RouteStyleDetail/NEW/" + me._sbu + "/" + pIONO
                        // action: "manage&/RouteStyleDetail/NEW/" + me._sbu + "/" + me._ioNo
                    }
                    // params: {
                    //     "styleno": "NEW",
                    //     "sbu": me._sbu
                    // }
                })) || ""; // generate the Hash to display style

                oCrossAppNavigator.toExternal({
                    target: {
                        shellHash: hash
                    }
                }); // navigate to Supplier application

                this._routeToStyle = true;
            },

            onSaveTableLayout(arg) {
                //saving of the layout of table
                var me = this;
                var aTables = [];

                if (arg === "style") {
                    aTables.push({
                        TYPE: "IOCOLOR",
                        TABNAME: "ZERP_IOATTRIB",
                        TABID: "colorTab"
                    },
                        {
                            TYPE: "IOPROCESS",
                            TABNAME: "ZERP_IOPROC",
                            TABID: "processTab"
                        },
                        {
                            TYPE: "IOSIZE",
                            TABNAME: "ZERP_IOATTRIB",
                            TABID: "sizeTab"
                        },
                        {
                            TYPE: "IOSTYLDTLDBOM",
                            TABNAME: "ZERP_S_STYLBOM",
                            TABID: "styleDetldBOMTab"
                        },
                        // {
                        //     TYPE: "IOSTYLBOMUV",
                        //     TABNAME: "ZERP_S_STYLBOMUV",
                        //     TABID: "styleBOMUVTab"
                        // },
                        {
                            TYPE: "IOSTYLMATLIST",
                            TABNAME: "ZERP_S_STYLMATLST",
                            TABID: "styleMatListTab"
                        })
                }
                else if (arg === "ioMatList") {
                    aTables.push({
                        TYPE: "IOMATLIST",
                        TABNAME: "ZERP_IOMATLST",
                        TABID: "ioMatListTab"
                    })
                }

                aTables.forEach(item => {
                    setTimeout(() => {
                        var oTable = this.getView().byId(item.TABID);
                        var oColumns = oTable.getColumns();
                        var ctr = 1;

                        var oParam = {
                            "SBU": this._sbu,
                            "TYPE": item.TYPE,
                            "TABNAME": item.TABNAME,
                            "TableLayoutToItems": []
                        };

                        //get information of columns, add to payload
                        oColumns.forEach((column) => {
                            oParam.TableLayoutToItems.push({
                                COLUMNNAME: column.mProperties.sortProperty,
                                ORDER: ctr.toString(),
                                SORTED: column.mProperties.sorted,
                                SORTORDER: column.mProperties.sortOrder,
                                SORTSEQ: "1",
                                VISIBLE: column.mProperties.visible,
                                WIDTH: column.mProperties.width
                            });

                            ctr++;
                        });
                        // console.log(oParam)
                        //call the layout save
                        var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");

                        oModel.create("/TableLayoutSet", oParam, {
                            method: "POST",
                            success: function (data, oResponse) {
                                MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_LAYOUT_SAVE"]);
                            },
                            error: function (err) {
                                sap.m.MessageBox.error(err);
                            }
                        });
                    }, 100);
                })
            },

            onIOGenMatList: async function () {
                var me = this;

                var iAccRowCount = this.byId("styleAccBOMTab").getModel("DataModel").getData().results.items.length;
                var iFabRowCount = this.byId("styleFabBOMTab").getModel("DataModel").getData().results.items.length;

                var oParam = {};
                var oMessage;
                var hasValid = false;
                var vIONo = this._ioNo
                var retMsg = "";
                var MatListStat;

                if (this._ioNo === "NEW") vIONo = this.getView().getModel("ui2").getProperty("/currIONo");

                if (iAccRowCount + iFabRowCount > 0) {
                    oParam = {
                        "SBU": this._sbu,
                        "IONO": vIONo,
                        "MATTYPGRP": "FAB"
                    };
                    // console.log(oParam)

                    _promiseResult = new Promise((resolve, reject) => {
                        setTimeout(() => {
                            this._oModelStyle.create("/GenIOMatListSet", oParam, {
                                method: "POST",
                                success: function (data, oResponse) {
                                    oMessage = JSON.parse(oResponse.headers["sap-message"]);
                                    // console.log("FAB - " + oMessage.message);

                                    retMsg = oMessage.message;

                                    if (oMessage.message === "1") {
                                        hasValid = true;
                                    }

                                    resolve();
                                },
                                error: function (err) {
                                    // sap.m.MessageBox.error(err);
                                    resolve();
                                }
                            });
                        }, 100);
                    })
                    await _promiseResult;

                    _promiseResult = new Promise((resolve, reject) => {
                        // if (retMsg === "2") {
                        oParam = {
                            "SBU": this._sbu,
                            "IONO": vIONo,
                            "MATTYPGRP": "ACC"
                        };
                        // console.log(oParam)

                        setTimeout(() => {
                            this._oModelStyle.create("/GenIOMatListSet", oParam, {
                                method: "POST",
                                success: function (data, oResponse) {
                                    oMessage = JSON.parse(oResponse.headers["sap-message"]);
                                    // console.log("ACC - " + oMessage.message);
                                    retMsg = oMessage.message;

                                    if (oMessage.message === "1")
                                        hasValid = true;

                                    resolve();
                                },
                                error: function (err) {
                                    // sap.m.MessageBox.error(err);
                                    resolve();
                                }
                            });
                        }, 100);
                        // }
                        // else resolve();
                    })
                    await _promiseResult;

                    if (retMsg === "0") {
                        MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_NO_IOMATLIST_GENERATED"]);
                    } else if (retMsg === "1") {
                        me.onRefresh("ioMatList");
                        me.getIOSTATUSData(vIONo);
                        await me.refreshHeaderData();
                        MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_IOMATLIST_GENERATED"]);
                    }
                    else if (retMsg === "2") {
                        // MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_INVALID_IOMATLIST_GENERATED"]);
                        MessageBox.information(
                            me.getView().getModel("ddtext").getData()["INFO_INVALID_IOMATLIST_GENERATED"],
                            {
                                actions: [MessageBox.Action.OK, "Go To Color Mapping"],
                                onClose: function (sAction) {
                                    if (sAction !== "OK") {
                                        var cIconTabBar = me.getView().byId("idIconTabBarInlineMode");
                                        cIconTabBar.setSelectedKey("itfSTYLE");

                                        var cIconTabBarStyle = me.getView().byId("itbStyleDetail");
                                        cIconTabBarStyle.setSelectedKey("color");
                                    }
                                }
                            }
                        );
                    }
                } else {
                    MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_NO_DATA_TO_PROC"]);
                }
            },

            async onGenMatList(arg) {
                var me = this;
                var iRowCount = 0;
                var vIONo = this._ioNo

                if (this._ioNo === "NEW") vIONo = this.getView().getModel("ui2").getProperty("/currIONo");

                //check if with color mapping


                if (arg === "ACC") {
                    // console.log(this.byId("styleAccBOMTab").getModel("DataModel").getData().results.items.length)
                    iRowCount = this.byId("styleAccBOMTab").getModel("DataModel").getData().results.items.length;
                }
                else if (arg === "FAB") {
                    // console.log(this.byId("styleFabBOMTab").getModel("DataModel").getData().results.items.length)
                    iRowCount = this.byId("styleFabBOMTab").getModel("DataModel").getData().results.items.length;
                }

                if (iRowCount > 0) {
                    await this.lock(this);
                    if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {
                        var oParam = {
                            "SBU": this._sbu,
                            "IONO": vIONo,
                            "MATTYPGRP": arg
                        };
                        // console.log(oParam)
                        this._oModelStyle.create("/GenIOMatListSet", oParam, {
                            method: "POST",
                            success: async function (data, oResponse) {
                                var oMessage = JSON.parse(oResponse.headers["sap-message"]);

                                if (oMessage.message === "0") {
                                    MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_NO_IOMATLIST_GENERATED"]);
                                }
                                else if (oMessage.message === "1") {
                                    MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_IOMATLIST_GENERATED"]);

                                    // console.log("ioMatList");
                                    me.onRefresh("ioMatList");
                                    // console.log("getIOSTATUSData");
                                    me.getIOSTATUSData(vIONo);
                                    // console.log("refreshHeaderData");
                                    await me.refreshHeaderData();
                                }
                                else if (oMessage.message === "2") {
                                    // MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_INVALID_IOMATLIST_GENERATED"]);
                                    MessageBox.information(
                                        me.getView().getModel("ddtext").getData()["INFO_INVALID_IOMATLIST_GENERATED"],
                                        {
                                            actions: [MessageBox.Action.OK, "Go To Color Mapping"],
                                            onClose: function (sAction) {
                                                if (sAction !== "OK") {
                                                    var cIconTabBarStyle = me.getView().byId("itbStyleDetail");
                                                    cIconTabBarStyle.setSelectedKey("color");
                                                }
                                            }
                                        }
                                    );
                                }
                            },
                            error: function (err) {
                                // sap.m.MessageBox.error(err);
                            }
                        });
                        this.unLock();
                    } else
                        MessageBox.error(this.getView().getModel("ui").getProperty("/LockMessage"));
                }
                else {
                    MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_NO_DATA_TO_PROC"]);
                }
            },

            //******************************************* */
            // MATERIAL LIST
            //******************************************* */            

            initIOMatList: function (oEvent) {
                this._oModelIOMatList = this.getOwnerComponent().getModel("ZGW_3DERP_IOMATLIST_SRV");
                // this._aColumns = {};
                // this._aDataBeforeChange = [];
                var me = this;
                this.getView().setModel(new JSONModel(), "matTypInfoRecChk");

                this.byId("ioMatListTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                var vIONo = this._ioNo; //"1000115";

                this._oModelIOMatList.setHeaders({
                    SBU: this._sbu,
                    PRODPLANT: this._prodplant
                });
                // console.log(this._sbu,this._prodplant)
                this._oModelIOMatList.read('/MainSet', {
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "'"
                    },
                    success: function (oData, response) {
                        oData.results.sort((a, b) => (a.SEQNO > b.SEQNO ? 1 : -1));

                        oData.results.forEach((row, index) => {
                            row.ACTIVE = index === 0 ? "X" : "";
                            row.POQTY = row.POQTY + "";
                            row.INDCQTY = row.INDCQTY + "";
                            row.ISSTOPROD = row.ISSTOPROD + "";
                            row.MITQTY = row.MITQTY + "";
                            row.MRPQTY = row.MRPQTY + "";
                            row.MRTRANSFERQTY = row.MRTRANSFERQTY + "";
                            row.PLANTAVAILQTY = row.PLANTAVAILQTY + "";
                            row.PRQTY = row.PRQTY + "";
                            row.VARIANCE = row.VARIANCE + "";
                            row.DELETED = row.DELETED === "X" ? true : false;
                        });

                        me.byId("ioMatListTab").getModel().setProperty("/rows", oData.results);
                        me.byId("ioMatListTab").bindRows("/rows");
                        me._tableRendered = "ioMatListTab";


                        me._oModelIOMatList.read('/InfoRecCheckSet', {
                            success: function (oData2) {
                                me.getView().getModel("matTypInfoRecChk").setProperty("/", oData2.results);
                            },
                            error: function (err) { }
                        })
                    },
                    error: function (err) { }
                })

                //get column value help prop
                this.getIOMatListColumnProp();
                this.getIOMatListFunctionConfig("IOMATLIST");

                this._oModelIOMatList.read('/UOMSet', {
                    success: function (oData, response) {
                        me.getView().setModel(new JSONModel(oData.results), "UOMConfig");
                    },
                    error: function (err) { }
                })
            },

            getIOMatListColumnProp: async function () {
                // var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                // var oModelColumns = new JSONModel();
                // await oModelColumns.loadData(sPath);

                var oColumns = []; //oModelColumns.getData();

                //get dynamic columns based on saved layout or ZERP_CHECK
                setTimeout(() => {
                    this.getIOMatListDynamicColumns("IOMATLIST", "ZDV_3DERP_MATLST", "ioMatListTab", oColumns);
                }, 100);
            },

            getIOMatListDynamicColumns(arg1, arg2, arg3, arg4) {
                var me = this;
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var vSBU = this._sbu; //"VER"; //this.getView().getModel("ui").getData().sbu;

                oModel.setHeaders({
                    sbu: vSBU,
                    type: sType,
                    tabname: sTabName
                });

                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        // console.log(sTabId, oData)
                        if (oData.results.length > 0) {

                            if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                                oData.results.forEach(item => {
                                    oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                        .forEach(col => item.ValueHelp = col.ValueHelp)
                                })
                            }

                            me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                            me.setIOMatListTableColumns(sTabId, oData.results);
                        }
                    },
                    error: function (err) {
                    }
                });
            },

            setIOMatListTableColumns(arg1, arg2) {
                var me = this;
                var sTabId = arg1;
                var oColumns = arg2;
                // console.log(oColumns)
                // oColumns.push({
                //     ColumnLabel: "Active",
                //     ColumnName: "ACTIVE",
                //     ColumnType: "STRING",
                //     ColumnWidth: 100,
                //     Creatable: false,
                //     DataType: "STRING",
                //     Decimal: 0,
                //     DictType: "",
                //     Editable: false,
                //     Key: "",
                //     Length: 1,
                //     Mandatory: false,
                //     Order: "000",
                //     Pivot: "",
                //     SortOrder: "",
                //     SortSeq: "",
                //     Sorted: false,
                //     Visible: false
                // })
                var oTable = this.getView().byId(sTabId);

                oTable.getModel().setProperty("/columns", oColumns);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = me.getStyleColumnDesc(sTabId, context.getObject()); //context.getObject().ColumnLabel;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnDataType = context.getObject().DataType;

                    if (sColumnWidth === 0) sColumnWidth = 100;

                    var oTemplate;

                    if (sColumnDataType !== "BOOLEAN") {
                        oTemplate = new sap.m.Text({
                            text: "{" + sColumnId + "}",
                            wrapping: false,
                            tooltip: sColumnDataType === "BOOLEAN" ? "" : "{" + sColumnId + "}"
                        })
                    }
                    else {
                        oTemplate = new sap.m.CheckBox({
                            selected: "{" + sColumnId + "}",
                            editable: false
                        })
                    }

                    return new sap.ui.table.Column({
                        id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                        label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),
                        template: oTemplate,
                        width: sColumnWidth + "px",
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });
            },

            getIOMatListFunctionConfig(arg) {
                var me = this;
                var sType = arg;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var vSBU = this._sbu; //"VER"; //this.getView().getModel("ui").getData().sbu;

                oModel.setHeaders({
                    sbu: vSBU,
                    type: sType
                });

                oModel.read("/FunctionSet", {
                    success: function (oData, oResponse) {
                        // console.log(sTabId, oData)
                        if (oData.results.length > 0) {
                            me._aFunction["ioMatListTab"] = oData.results;

                            oData.results.forEach(item => {
                                while (item.VALUE.substring(0, 1) === "0") item.VALUE = item.VALUE.substring(1, item.VALUE.length);
                            })

                            var oFunction = oData.results.filter(fItem => fItem.NAME === "DELETE");
                            if (oFunction.length > 0) {
                                if (oFunction[0].VALUE === "5") {
                                    me.byId("btnDeleteIOMatList").setVisible(false);
                                }
                            }
                        }
                    },
                    error: function (err) { }
                });
            },

            onAssignMatNo: async function (oEvent) {
                var oTable = this.byId("ioMatListTab");
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var aParam = [];

                if (oSelectedIndices.length > 0) {
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    oSelectedIndices = oTmpSelectedIndices;

                    oSelectedIndices.forEach((item, index) => {
                        // console.log(aData.at(item));
                        if (aData.at(item).MATNO === "" && aData.at(item).DELETED === false) {
                            aParam.push(aData.at(item));
                        }
                    })

                    if (aParam.length > 0) {
                        await this.lock(this);
                        if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {
                            this.getOwnerComponent().getModel("ASSIGNMATNO_MODEL").setData({
                                data: aParam
                            })

                            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                            oRouter.navTo("RouteIOAssignMaterial", {
                                iono: this._ioNo,
                                sbu: this._sbu
                            });

                            this.getView().getModel("ui2").setProperty("/icontabfilterkey", "itfMATLIST");
                        } else
                            MessageBox.error(this.getView().getModel("ui").getProperty("/LockMessage"));
                    }
                    else {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INVALID_RECORD_FOR_MATNO_CREATE"]);
                    }
                }
                else {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
                }
            },

            onSubmitMRP: async function (oEvent) {
                var me = this;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oTable = this.byId("ioMatListTab");
                var oSelectedIndices = oTable.getSelectedIndices();
                var oTmpSelectedIndices = [];
                var aData = oTable.getModel().getData().rows;
                var aParam = [],
                    aParam2 = [];
                var oParam = {};
                var vInfoRec = true;
                var aMatTypInfoRecChk = this.getView().getModel("matTypInfoRecChk").getData();
                var aMatTypInfoRecInc = [];

                await me.lock(me);
                if (this.getView().getModel("ui").getProperty("/LockType") === "E") {
                    MessageBox.information(this.getView().getModel("ui").getProperty("/LockMessage"));
                    return;
                }

                if (oSelectedIndices.length > 0) {
                    oSelectedIndices.forEach(item => {
                        oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                    })

                    oSelectedIndices = oTmpSelectedIndices;

                    oSelectedIndices.forEach((item, index) => {
                        if (aData.at(item).VARIANCE > 0 && aData.at(item).MATNO !== "" && aData.at(item).DELETED === false) {
                            aParam.push({
                                Mrptyp: "IOMRP",
                                Plantcd: me._prodplant,
                                Iono: aData.at(item).IONO,
                                Matno: aData.at(item).MATNO,
                                Baseuom: aData.at(item).UOM,
                                Reqqty: aData.at(item).VARIANCE,
                                Purgrp: aData.at(item).PURGRP,
                                Supplytyp: aData.at(item).SUPPLYTYP,
                                Vendorcd: aData.at(item).VENDORCD,
                                Unitprice: aData.at(item).UNITPRICE,
                                Orderuom: aData.at(item).ORDERUOM,
                                Umrez: aData.at(item).UMREZ,
                                Umren: aData.at(item).UMREN,
                                Purplant: aData.at(item).PURPLANT
                            });

                            aParam2.push({
                                Matno: aData.at(item).MATNO,
                                Baseuom: aData.at(item).UOM,
                                Reqqty: aData.at(item).VARIANCE,
                                Purgrp: aData.at(item).PURGRP,
                                Supplytyp: aData.at(item).SUPPLYTYP,
                                Vendorcd: aData.at(item).VENDORCD,
                                Unitprice: aData.at(item).UNITPRICE,
                                Orderuom: aData.at(item).ORDERUOM,
                                Umrez: aData.at(item).UMREZ,
                                Umren: aData.at(item).UMREN,
                                Purplant: aData.at(item).PURPLANT,
                                Currencycd: aData.at(item).CURRENCYCD
                            });

                            if (aMatTypInfoRecChk.filter(fItem => fItem.MATTYP === aData.at(item).MATTYP).length > 0 && aData.at(item).SUPPLYTYP === "NOM" &&
                                (aData.at(item).ORDERUOM === "" || aData.at(item).PURGRP === "" || aData.at(item).PURGRP === "" || aData.at(item).PURPLANT === "" || aData.at(item).VENDORCD === "" || +aData.at(item).UNITPRICE === 0)) {
                                vInfoRec = false;
                                aMatTypInfoRecInc.push(aData.at(item).MATTYP);
                            }
                        }
                    })

                    if (aParam.length > 0) {
                        Common.openLoadingDialog(this);
                        // await me.lock(me);
                        // if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {
                        if (!vInfoRec) {
                            var uq = [...new Set(aMatTypInfoRecInc.map(i => i))];

                            MessageBox.confirm(me.getView().getModel("ddtext").getData()["INFO_INVALID_CREATE_INFOREC"].replace("{mattyp}", uq.join(", ")).replaceAll(".", ".\r\n"), {
                                actions: ["Yes", "No"],
                                onClose: function (sAction) {
                                    if (sAction === "Yes") {
                                        oParam["SBU"] = this._sbu;
                                        oParam["MRPTYP"] = "IOMRP";
                                        oParam["N_CreateMRPDataParam"] = aParam;
                                        oParam["N_CreateMRPDataReturn"] = [];
                                        // console.log(oParam)

                                        oModel.create("/CreateMRPDataSet", oParam, {
                                            method: "POST",
                                            success: function (oDataReturn, oResponse) {
                                                //assign the materials based on the return
                                                // console.log(oDataReturn)

                                                // me.unLock();
                                                Common.closeLoadingDialog(me);

                                                if (oDataReturn.N_CreateMRPDataReturn.results.length > 0) {
                                                    MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_MRPDATA_CREATED"]);
                                                    me.onRefresh("ioMatList");
                                                }

                                                me.extendMaterial(oDataReturn.N_CreateMRPDataReturn.results);
                                                me.createInfoRecord(oDataReturn.N_CreateMRPDataReturn.results, aParam2);
                                            },
                                            error: function (err) {
                                                // me.unLock();
                                                Common.closeLoadingDialog(me);
                                            }
                                        });
                                    }
                                    else {
                                        Common.closeLoadingDialog(me);
                                        me.unLock();
                                    }
                                }
                            })
                        }
                        else {
                            oParam["SBU"] = this._sbu;
                            oParam["MRPTYP"] = "IOMRP";
                            oParam["N_CreateMRPDataParam"] = aParam;
                            oParam["N_CreateMRPDataReturn"] = [];
                            // console.log(oParam)
                            oModel.create("/CreateMRPDataSet", oParam, {
                                method: "POST",
                                success: function (oDataReturn, oResponse) {
                                    //assign the materials based on the return
                                    // console.log(oDataReturn)

                                    // me.unLock();
                                    Common.closeLoadingDialog(me);

                                    if (oDataReturn.N_CreateMRPDataReturn.results.length > 0) {
                                        MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_MRPDATA_CREATED"]);
                                        me.onRefresh("ioMatList");
                                    }

                                    me.extendMaterial(oDataReturn.N_CreateMRPDataReturn.results);
                                    me.createInfoRecord(oDataReturn.N_CreateMRPDataReturn.results, aParam2);
                                },
                                error: function (err) {
                                    // me.unLock();
                                    Common.closeLoadingDialog(me);
                                }
                            });
                        }
                        // } else {
                        //     Common.closeLoadingDialog(this);
                        //     MessageBox.information(this.getView().getModel("ui").getProperty("/LockMessage"));
                        // }
                        // Common.closeLoadingDialog(this);
                    }
                    else {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_IVALID_RECORD_FOR_MRP"]);
                    }
                }
                else {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
                }

                if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {
                    me.unLock();
                }
            },

            extendMaterial(arg) {
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var aData = arg;
                var oParam = {};

                aData.forEach(item => {
                    oParam["IMATNR"] = item.Matno;
                    oParam["IWERKSFROM"] = item.Purplant;
                    oParam["IWERKSTO"] = item.Plantcd;
                    oParam["ERETCODE"] = "";
                    oParam["N_ExtendMaterialReturn"] = [];

                    oModel.setUseBatch(false);
                    oModel.create("/ExtendMaterialSet", oParam, {
                        method: "POST",
                        success: function (oDataReturn, oResponse) {
                            //assign the materials based on the return
                            // console.log(oDataReturn);
                        },
                        error: function (err) {
                            // Common.closeLoadingDialog(me);
                        }
                    })
                })
            },

            createInfoRecord(arg1, arg2) {
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var aData = arg1,
                    aData2 = arg2;
                var oParam = {};
                var oInput = [];

                aData.forEach(item => item.Vendorcd = this.pad(item.Vendorcd, 10));
                aData2.forEach(item => item.Vendorcd = this.pad(item.Vendorcd, 10));

                aData.forEach(item => {
                    if (item.Supplytyp === "NOM") {
                        var oCurr = aData2.filter(fItem => fItem.Matno === item.Matno && fItem.Vendorcd === item.Vendorcd && fItem.Baseuom === item.Baseuom && fItem.Orderuom === item.Orderuom
                            && +fItem.Unitprice === +item.Unitprice && +fItem.Reqqty === +item.Reqqty && fItem.Purplant === item.Purplant && fItem.Supplytyp === item.Supplytyp)

                        oInput.push({
                            Lifnr: item.Vendorcd,
                            Matnr: item.Matno,
                            Meins: item.Baseuom,
                            Bstme: item.Orderuom,
                            Umren: item.Umren === "" ? "1" : item.Umren,
                            Umrez: item.Umrez === "" ? "1" : item.Umrez,
                            Ekgrp: item.Purgrp,
                            Netpr: item.Unitprice,
                            Waers: oCurr.length > 0 ? oCurr[0].Currencycd : "",
                            Meins2: item.Orderuom,
                            Purplant: item.Purplant
                        })
                    }
                })

                // var oParam = {
                //     "SBU": "VER",
                //     "N_CreateInfoRecParam": [
                //         {
                //             "Lifnr": "0003102244",
                //             "Matnr": "1000025-00040",
                //             "Meins": "PC",
                //             "Bstme": "PC",
                //             "Umren": "1",
                //             "Umrez": "1",
                //             "Ekgrp": "601",
                //             "Netpr": "1.000",
                //             "Waers": "HKD",
                //             "Meins2": "PC",
                //             "Purplant": "C600"
                //         }
                //     ],
                //     "N_CreateInfoRecReturn": []
                // }

                if (oInput.length > 0) {
                    oParam["SBU"] = this._sbu;
                    oParam["N_CreateInfoRecParam"] = oInput;
                    oParam["N_CreateInfoRecReturn"] = [];
                    console.log(oParam)
                    oModel.setUseBatch(false);
                    oModel.create("/CreateInfoRecordSet", oParam, {
                        method: "POST",
                        success: function (oDataReturn, oResponse) {
                            //assign the materials based on the return
                            console.log(oDataReturn);
                        },
                        error: function (err) {
                            // Common.closeLoadingDialog(me);
                        }
                    })
                }
            },

            onReorder: async function (oEvent) {
                var oTable = this.byId("ioMatListTab");
                // console.log(this.getView().getModel("UOMConfig").getData())

                if (oTable.getModel().getData().rows.length > 0) {
                    await this.lock(this);
                    if (this.getView().getModel("ui").getProperty("/LockType") !== "E") {
                        this._bRefreshIOMatlist = false;
                        this._aForReorder = [];

                        var oSelectedIndices = oTable.getSelectedIndices();
                        var oTmpSelectedIndices = [];
                        var aData = oTable.getModel().getData().rows;

                        var vIONo = this._ioNo;
                        if (this._ioNo === "NEW") vIONo = this.getView().getModel("ui2").getProperty("/currIONo");

                        if (oSelectedIndices.length > 0) {
                            oSelectedIndices.forEach(item => {
                                oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                            })

                            oSelectedIndices = oTmpSelectedIndices;

                            oSelectedIndices.forEach((item, index) => {
                                var vANDEC = 0;

                                this.getView().getModel("UOMConfig").getData().filter(fItem => fItem.MSEHI === aData.at(item).UOM).forEach(item => vANDEC = item.ANDEC);

                                this._aForReorder.push({
                                    IONO: vIONo,
                                    MATNO: aData.at(item).MATNO,
                                    SEQNO: aData.at(item).SEQNO,
                                    REORDERQTY: "0",
                                    REMARKS: "",
                                    DELETED: false,
                                    CREATEDBY: "",
                                    CREATEDDT: "",
                                    UPDATEDBY: "",
                                    UPDATEDDT: "",
                                    UOM: aData.at(item).UOM,
                                    ANDEC: vANDEC
                                })
                            })

                            this._aForReorder.sort((a, b) => (a.SEQNO > b.SEQNO ? 1 : -1));
                        }

                        this.getReorderData(true, this._aForReorder.length === 0 ? false : true);
                        this.unLock();
                    } else
                        MessageBox.error(this.getView().getModel("ui").getProperty("/LockMessage"));
                }
                else {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_MATLIST"]);
                }
            },

            getReorderData(arg1, arg2) {
                Common.openProcessingDialog(this, "Processing...");
                var me = this;
                var vIONo = this._ioNo;
                if (this._ioNo === "NEW") vIONo = this.getView().getModel("ui2").getProperty("/currIONo");

                this._oModelIOMatList.read('/ReorderSet', {
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "'"
                    },
                    success: function (oData, oResponse) {
                        oData.results.sort((a, b) => (a.SEQNO > b.SEQNO ? 1 : -1));

                        oData.results.forEach((item, index) => {
                            item.DELETED = item.DELETED === "X" ? true : false;
                            item.NEW = false;
                            item.EDITED = false;
                            item.ACTIVE = index === 0 ? "X" : "";
                            item.UOM = "";
                            item.ANDEC = 0;

                            if (item.CREATEDDT !== null)
                                item.CREATEDDT = dateFormat.format(new Date(item.CREATEDDT));

                            if (item.UPDATEDDT !== null)
                                item.UPDATEDDT = dateFormat.format(new Date(item.UPDATEDDT));

                            var sSeqNo = item.SEQNO;
                            if (!isNaN(sSeqNo)) {
                                while (sSeqNo.length < 3) sSeqNo = "0" + sSeqNo;
                            }

                            item.SEQNO = sSeqNo;
                        });

                        me._bReorderChanged = false;
                        me._sTableModel = "reorder";
                        me.unLock();
                        Common.closeProcessingDialog(me);

                        if (arg1) me.showReorder(oData.results, arg2);
                        else {
                            var oTable = sap.ui.getCore().byId("reorderTab");
                            me._ReorderDialog.getModel().setProperty("/rowCount", oData.results.length);
                            oTable.getModel().setProperty("/rows", oData.results);
                            oTable.bindRows("/rows");
                        }
                    },
                    error: function (err) {
                        me.unLock();
                    }
                })
            },

            showReorder(arg1, arg2) {
                var me = this;
                var oData = arg1;

                if (!me._ReorderDialog) {
                    me._ReorderDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.ReorderDialog", me);

                    me._ReorderDialog.setModel(
                        new JSONModel({
                            rows: oData,
                            rowCount: oData.length
                        })
                    )

                    me.getView().addDependent(me._ReorderDialog);

                    var oTableEventDelegate = {
                        onkeyup: function (oEvent) {
                            me.onKeyUp(oEvent);
                        },

                        onAfterRendering: function (oEvent) {
                            var oControl = oEvent.srcControl;
                            var sTabId = oControl.sId.split("--")[oControl.sId.split("--").length - 1];

                            if (sTabId.substr(sTabId.length - 3) === "Tab") me._tableRendered = sTabId;
                            else me._tableRendered = "";

                            me.onAfterTableRendering();
                        }
                    };

                    sap.ui.getCore().byId("reorderTab").addEventDelegate(oTableEventDelegate);
                }
                else {
                    me._ReorderDialog.getModel().setProperty("/rows", oData);
                    me._ReorderDialog.getModel().setProperty("/rowCount", oData.length);
                }

                me._ReorderDialog.setTitle("Reorder");
                me._ReorderDialog.open();

                var tmpOData = jQuery.extend(true, [], this._aForReorder);
                tmpOData.forEach((item, index) => item.RowIndex === index);
                tmpOData.sort((a, b) => (a.SEQNO > b.SEQNO ? -1 : 1));

                if (arg2) {
                    tmpOData.forEach(item => {
                        if (oData.filter(fItem => fItem.SEQNO === item.SEQNO).length > 0) {
                            this._aForReorder.splice(item.RowIndex, 1);
                        }
                    })

                    if (this._aForReorder.length > 0) {
                        me.onNewReorder();

                        this._aForReorder.forEach((item, index) => {
                            if (index > 0) {
                                this.addReorder();
                            }
                        })

                        var iCounter = 0;

                        sap.ui.getCore().byId("reorderTab").getModel().getData().rows.forEach(item => {
                            if (item.NEW === true) {
                                item.MATNO = this._aForReorder[iCounter].MATNO;
                                item.SEQNO = this._aForReorder[iCounter].SEQNO;
                                item.UOM = this._aForReorder[iCounter].UOM;
                                item.ANDEC = this._aForReorder[iCounter].ANDEC;
                                iCounter++;
                            }
                        })
                    }
                }
            },

            onNewReorder: function (oEvent) {
                var vhMatNo = this.byId("ioMatListTab").getModel().getData().rows.filter(fItem => fItem.DELETED === false);
                this.getView().setModel(new JSONModel(vhMatNo), "IOMATLIST_MODEL");
                this._validationErrors = [];
                this._aDataBeforeChange = jQuery.extend(true, [], this._ReorderDialog.getModel().getData().rows);

                var oTable = sap.ui.getCore().byId("reorderTab");
                var aNewRow = [];
                var oNewRow = {};

                oTable.getColumns().forEach((col, idx) => {
                    var sColName = "";

                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }

                    if (sColName === "MATNO") {
                        oNewRow[sColName] = "";
                        col.setTemplate(new sap.m.Input({
                            // id: "reorderMATNO",
                            type: "Text",
                            value: "{" + sColName + "}",
                            showValueHelp: true,
                            valueHelpRequest: this.handleReorderValueHelp.bind(this),
                            showSuggestion: true,
                            maxSuggestionWidth: "225px",
                            suggestionItems: {
                                path: "IOMATLIST_MODEL>/",
                                length: 10000,
                                template: new sap.ui.core.ListItem({
                                    key: "{IOMATLIST_MODEL>MATNO}",
                                    text: "{IOMATLIST_MODEL>MATNO}",
                                    additionalText: "{IOMATLIST_MODEL>SEQNO}",
                                }),
                                templateShareable: false
                            },
                            // suggest: this.handleSuggestion.bind(this),
                            change: this.handleValueHelpChange.bind(this),
                            suggestionItemSelected: this.handleSuggestionItemSelected.bind(this),
                            enabled: {
                                path: "NEW",
                                formatter: function (NEW) {
                                    if (NEW === true) { return true }
                                    else { return false }
                                }
                            }
                        }));
                    }
                    else if (sColName === "REORDERQTY") {
                        oNewRow[sColName] = "0";
                        col.setTemplate(new sap.m.Input({
                            type: sap.m.InputType.Number,
                            textAlign: sap.ui.core.TextAlign.Right,
                            value: "{path:'" + sColName + "', formatOptions:{ minFractionDigits:5, maxFractionDigits:5 }, constraints:{ precision:18, scale:5 }}",
                            liveChange: this.onReorderQtyLiveChange.bind(this),
                            enabled: {
                                path: "NEW",
                                formatter: function (NEW) {
                                    if (NEW === true) { return true }
                                    else { return false }
                                }
                            }
                        }));
                    }
                    else if (sColName === "DELETED") {
                        oNewRow[sColName] = false;
                    }
                    else if (sColName === "REMARKS") {
                        oNewRow[sColName] = "";
                        col.setTemplate(new sap.m.Input({
                            type: "Text",
                            value: "{" + sColName + "}",
                            maxLength: 1000,
                            change: this.onInputLiveChange.bind(this),
                            enabled: {
                                path: "NEW",
                                formatter: function (NEW) {
                                    if (NEW === true) { return true }
                                    else { return false }
                                }
                            }
                        }));
                    }

                    if (sColName === "MATNO" || sColName === "REORDERQTY") {
                        col.getLabel().addStyleClass("sapMLabelRequired");
                    }
                })

                oNewRow["UOM"] = "";
                oNewRow["ANDEC"] = 0;
                oNewRow["NEW"] = true;
                aNewRow.push(oNewRow);
                var aDataAfterChange = aNewRow.concat(oTable.getModel().getData().rows);

                this._ReorderDialog.getModel().setProperty("/rowCount", aDataAfterChange.length);
                oTable.getModel().setProperty("/rows", aDataAfterChange);
                oTable.bindRows("/rows");

                this._bReorderChanged = true;
                this._dataMode = "NEW";
                sap.ui.getCore().byId("btnNewReorder").setVisible(false);
                sap.ui.getCore().byId("btnEditReorder").setVisible(false);
                sap.ui.getCore().byId("btnAddReorder").setVisible(true);
                sap.ui.getCore().byId("btnSaveReorder").setVisible(true);
                sap.ui.getCore().byId("btnCancelReorder").setVisible(true);
                sap.ui.getCore().byId("btnCloseReorder").setVisible(false);
                sap.ui.getCore().byId("btnDeleteReorder").setVisible(false);
                sap.ui.getCore().byId("btnRefreshReorder").setVisible(false);
                oTable.focus();
            },

            onReorderQtyLiveChange: function (oEvent) {
                if (this._validationErrors === undefined) this._validationErrors = [];
                // console.log("ok")
                var oSource = oEvent.getSource();
                // console.log(oSource)
                // var sModel = oSource.getBindingInfo("value").parts[0].model;
                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;
                var vDecPlaces = this._ReorderDialog.getModel().getProperty(sRowPath + '/ANDEC');
                var bError = false;

                // console.log(this._ReorderDialog.getModel().getProperty(sRowPath + '/SEQNO'));
                // console.log(this._ReorderDialog.getModel().getProperty(sRowPath + '/ANDEC'));

                if (oEvent.getParameters().value.split(".").length > 1) {
                    if (vDecPlaces === 0) {
                        // MessageBox.information("Value should not have decimal place/s.");
                        oEvent.getSource().setValueState("Error");
                        oEvent.getSource().setValueStateText("Value should not have decimal place/s.");
                        this._validationErrors.push(oEvent.getSource().getId());
                        bError = true;
                    }
                    else {
                        if (oEvent.getParameters().value.split(".")[1].length > vDecPlaces) {
                            oEvent.getSource().setValueState("Error");
                            oEvent.getSource().setValueStateText("Enter a number with a maximum decimal places: " + vDecPlaces.toString());
                            this._validationErrors.push(oEvent.getSource().getId());
                            bError = true;
                        }
                        else {
                            oEvent.getSource().setValueState("None");
                            this._validationErrors.forEach((item, index) => {
                                if (item === oEvent.getSource().getId()) {
                                    this._validationErrors.splice(index, 1)
                                }
                            })
                            bError = false;
                        }
                    }
                }
                else {
                    oEvent.getSource().setValueState("None");
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                    bError = false;
                }
            },

            onAddReorder: function (oEvent) {
                this.addReorder();
            },

            addReorder() {
                var oTable = sap.ui.getCore().byId("reorderTab");
                var aNewRow = [];
                var oNewRow = {};

                oTable.getColumns().forEach((col, idx) => {
                    var sColName = "";

                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.value !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.value.parts[0].path;
                    }

                    if (sColName === "REORDERQTY") oNewRow[sColName] = "0";
                    else if (sColName === "DELETED") oNewRow[sColName] = false;
                    else oNewRow[sColName] = "";
                })

                oNewRow["NEW"] = true;
                aNewRow.push(oNewRow);

                var aDataAfterChange = aNewRow.concat(oTable.getModel().getData().rows);

                oTable.getModel().setProperty("/rows", aDataAfterChange);
                oTable.bindRows("/rows");
                this._ReorderDialog.getModel().setProperty("/rowCount", aDataAfterChange.length);
            },

            onEditReorder: function (oEvent) {
                if (this._ReorderDialog.getModel().getData().rows.length === 0) {
                    MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_EDIT"]);
                    return;
                }

                var oTable = sap.ui.getCore().byId("reorderTab");

                this._validationErrors = [];
                this._aDataBeforeChange = jQuery.extend(true, [], this._ReorderDialog.getModel().getData().rows);

                oTable.getColumns().forEach((col, idx) => {
                    var sColName = "";

                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }

                    if (sColName === "REORDERQTY") {
                        col.setTemplate(new sap.m.Input({
                            type: sap.m.InputType.Number,
                            textAlign: sap.ui.core.TextAlign.Right,
                            value: "{path:'" + sColName + "', formatOptions:{ minFractionDigits:5, maxFractionDigits:5 }, constraints:{ precision:18, scale:5 }}",
                            change: this.onNumberChange.bind(this)
                        }));
                    }
                    // else if (sColName === "DELETED") {
                    //     col.setTemplate(new sap.m.CheckBox({selected: "{" + sColName + "}", editable: false}));
                    // }
                    else if (sColName === "REMARKS") {
                        col.setTemplate(new sap.m.Input({
                            type: "Text",
                            value: "{" + sColName + "}",
                            maxLength: 1000,
                            change: this.onInputLiveChange.bind(this)
                        }));
                    }

                    if (sColName === "REORDERQTY") {
                        col.getLabel().addStyleClass("sapMLabelRequired");
                    }
                })

                this._ReorderDialog.getModel().getData().rows.forEach(item => item.EDITED = false);

                this._dataMode = "EDIT";
                sap.ui.getCore().byId("btnNewReorder").setVisible(false);
                sap.ui.getCore().byId("btnEditReorder").setVisible(false);
                sap.ui.getCore().byId("btnAddReorder").setVisible(false);
                sap.ui.getCore().byId("btnSaveReorder").setVisible(true);
                sap.ui.getCore().byId("btnCancelReorder").setVisible(true);
                sap.ui.getCore().byId("btnCloseReorder").setVisible(false);
                sap.ui.getCore().byId("btnDeleteReorder").setVisible(false);
                sap.ui.getCore().byId("btnRefreshReorder").setVisible(false);
                oTable.focus();
            },

            onCancelReorder: function (oEvent) {
                if (this._dataMode === "NEW" || this._dataMode === "EDIT") {
                    if (this._bReorderChanged) {
                        var oData = {
                            Action: "update-cancel",
                            Text: this.getView().getModel("ddtext").getData()["CONFIRM_DISREGARD_CHANGE"]
                        }

                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(oData);

                        if (!this._ConfirmDialog) {
                            this._ConfirmDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.ConfirmDialog", this);

                            this._ConfirmDialog.setModel(oJSONModel);
                            this.getView().addDependent(this._ConfirmDialog);
                        }
                        else this._ConfirmDialog.setModel(oJSONModel);

                        this._ConfirmDialog.open();
                    }
                    else {
                        var oTable = sap.ui.getCore().byId("reorderTab");
                        this._ReorderDialog.getModel().setProperty("/rowCount", this._aDataBeforeChange.length);
                        oTable.getModel().setProperty("/rows", this._aDataBeforeChange);
                        oTable.bindRows("/rows");

                        this.setReorderReadMode();
                        this._dataMode = "READ";
                        sap.ui.getCore().byId("btnNewReorder").setVisible(true);
                        sap.ui.getCore().byId("btnEditReorder").setVisible(true);
                        sap.ui.getCore().byId("btnAddReorder").setVisible(false);
                        sap.ui.getCore().byId("btnSaveReorder").setVisible(false);
                        sap.ui.getCore().byId("btnCancelReorder").setVisible(false);
                        sap.ui.getCore().byId("btnCloseReorder").setVisible(true);
                        sap.ui.getCore().byId("btnDeleteReorder").setVisible(true);
                        sap.ui.getCore().byId("btnRefreshReorder").setVisible(true);
                    }
                }
            },

            onBatchSaveReorder: function (oEvent) {
                if (this._dataMode === "NEW" || this._dataMode === "EDIT") {
                    var oTable = sap.ui.getCore().byId("reorderTab");
                    var me = this;
                    var aNewRows = this._ReorderDialog.getModel().getData().rows.filter(item => item.NEW === true);
                    var aEditedRows = this._ReorderDialog.getModel().getData().rows.filter(item => item.EDITED === true && item.NEW !== true);

                    if (aNewRows.length > 0) {
                        if (this._validationErrors.length === 0) {
                            var oParam = {};
                            var oParamItems = [];

                            aNewRows.forEach(item => {
                                if (!(item.REORDERQTY === null || item.REORDERQTY + "" === "" || +item.REORDERQTY === 0) && item.MATNO !== "") {
                                    oParamItems.push({
                                        IONO: this.getView().getModel("ui2").getProperty("/currIONo"),
                                        MATNO: item.MATNO,
                                        SEQNO: item.SEQNO,
                                        REORDERQTY: item.REORDERQTY === null || item.REORDERQTY === "" ? "0" : item.REORDERQTY,
                                        REMARKS: item.REMARKS,
                                        DELETED: ""
                                    })
                                }

                            })

                            if (oParamItems.length === 0) {
                                MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INPUT_REQD_FIELDS"]);
                            }
                            else {
                                Common.openProcessingDialog(me, "Processing...");
                                oParam["IONO"] = this.getView().getModel("ui2").getProperty("/currIONo");
                                oParam["N_ReorderItems"] = oParamItems;
                                // console.log(oParam);
                                // return;
                                this._oModelIOMatList.create("/ChangeReorderSet", oParam, {
                                    method: "POST",
                                    success: function (oData, oResponse) {
                                        // console.log(oData)
                                        MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_REORDER_CREATED"]);
                                        me.setReorderReadMode();
                                        me._dataMode = "READ";
                                        sap.ui.getCore().byId("btnNewReorder").setVisible(true);
                                        sap.ui.getCore().byId("btnEditReorder").setVisible(true);
                                        sap.ui.getCore().byId("btnAddReorder").setVisible(false);
                                        sap.ui.getCore().byId("btnSaveReorder").setVisible(false);
                                        sap.ui.getCore().byId("btnCancelReorder").setVisible(false);
                                        sap.ui.getCore().byId("btnCloseReorder").setVisible(true);
                                        sap.ui.getCore().byId("btnDeleteReorder").setVisible(true);
                                        sap.ui.getCore().byId("btnRefreshReorder").setVisible(true);

                                        // const aDataAfterChange = me._aDataBeforeChange.concat(aNewRows);
                                        // aDataAfterChange.sort((a, b) => (a.SEQNO > b.SEQNO ? 1 : -1));

                                        // me._ReorderDialog.getModel().setProperty("/rowCount", aDataAfterChange.length);
                                        // oTable.getModel().setProperty("/rows", aDataAfterChange);
                                        // oTable.bindRows("/rows");

                                        me.getReorderData(false, false);
                                        me._bRefreshIOMatlist = true;
                                        Common.closeProcessingDialog(me);
                                    },
                                    error: function (oResponse) {
                                        var oError = JSON.parse(oResponse.responseText);
                                        MessageBox.information(oError.error.message.value.split(":").join("\n"));
                                        Common.closeProcessingDialog(me);
                                    }
                                });
                            }
                        }
                        else {
                            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                        }
                    }
                    else if (aEditedRows.length > 0) {
                        if (this._validationErrors.length === 0) {
                            var sEntitySet = "/ReorderSet";
                            var bProceed = true;

                            this._oModelIOMatList.setUseBatch(true);
                            this._oModelIOMatList.setDeferredGroups(["update"]);

                            var mParameters = {
                                "groupId": "update"
                            }

                            Common.openProcessingDialog(me, "Processing...");

                            aEditedRows.forEach(item => {
                                if (!(item.REORDERQTY === null || item.REORDERQTY + "" === "" || +item.REORDERQTY === 0)) {
                                    var entitySet = sEntitySet + "(IONO='" + item.IONO + "',MATNO='" + item.MATNO + "',SEQNO='" + item.SEQNO + "')";
                                    var param = {};

                                    param["REORDERQTY"] = item.REORDERQTY;
                                    param["REMARKS"] = item.REMARKS;

                                    // console.log(entitySet);
                                    // console.log(param);
                                    this._oModelIOMatList.update(entitySet, param, mParameters);
                                }
                                else { bProceed = false; }
                            })

                            if (!bProceed) {
                                MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_INPUT_REQD_FIELDS"]);
                            }
                            else {
                                this._oModelIOMatList.submitChanges({
                                    groupId: "update",
                                    success: function (oData, oResponse) {
                                        Common.closeProcessingDialog(me);
                                        MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_SAVE"]);
                                        me.setReorderReadMode();
                                        me._dataMode = "READ";
                                        sap.ui.getCore().byId("btnNewReorder").setVisible(true);
                                        sap.ui.getCore().byId("btnEditReorder").setVisible(true);
                                        sap.ui.getCore().byId("btnAddReorder").setVisible(false);
                                        sap.ui.getCore().byId("btnSaveReorder").setVisible(false);
                                        sap.ui.getCore().byId("btnCancelReorder").setVisible(false);
                                        sap.ui.getCore().byId("btnCloseReorder").setVisible(true);
                                        sap.ui.getCore().byId("btnDeleteReorder").setVisible(true);
                                        sap.ui.getCore().byId("btnRefreshReorder").setVisible(true);
                                        me._bRefreshIOMatlist = true;
                                        me.getReorderData(false, false);
                                    },
                                    error: function () {
                                        Common.closeProcessingDialog(me);
                                    }
                                })
                            }
                        }
                        else {
                            MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_CHECK_INVALID_ENTRIES"]);
                        }
                    }
                    else {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_MODIFIED"]);
                    }
                }
            },

            onDeleteReorder: function (oEvent) {
                if (this._dataMode === "READ") {
                    var me = this;
                    var oTable = sap.ui.getCore().byId("reorderTab");
                    var aSelIndices = oTable.getSelectedIndices();
                    var oTmpSelectedIndices = [];
                    var aData = this._ReorderDialog.getModel().getData().rows;
                    var sEntitySet = "/ReorderSet";

                    this._oModelIOMatList.setUseBatch(true);
                    this._oModelIOMatList.setDeferredGroups(["update"]);

                    var mParameters = {
                        "groupId": "update"
                    }

                    if (aSelIndices.length > 0) {
                        aSelIndices.forEach(item => {
                            oTmpSelectedIndices.push(oTable.getBinding("rows").aIndices[item])
                        })

                        aSelIndices = oTmpSelectedIndices;

                        MessageBox.confirm("Proceed to delete " + aSelIndices.length + " record(s)?", {
                            actions: ["Yes", "No"],
                            onClose: function (sAction) {
                                if (sAction === "Yes") {
                                    Common.openProcessingDialog(me, "Processing...");

                                    aSelIndices.forEach(item => {
                                        var entitySet = sEntitySet + "(IONO='" + aData.at(item).IONO + "',MATNO='" + aData.at(item).MATNO + "',SEQNO='" + aData.at(item).SEQNO + "')";
                                        var param = {};

                                        param["DELETED"] = "X";

                                        // console.log(param);
                                        me._oModelIOMatList.update(entitySet, param, mParameters);
                                    })

                                    me._oModelIOMatList.submitChanges({
                                        groupId: "update",
                                        success: function (oData, oResponse) {
                                            Common.closeProcessingDialog(me);
                                            MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_DATA_DELETED"]);
                                            me.getReorderData(false, false);

                                            // aSelIndices.forEach(item => {
                                            //     aData.at(item).DELETED = true;
                                            // })

                                            // oTable.getModel().setProperty("/rows", aData);
                                            // oTable.bindRows("/rows");
                                        },
                                        error: function () {
                                            Common.closeProcessingDialog(me);
                                        }
                                    })
                                }
                            }
                        })
                    }
                    else {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_SEL_RECORD_TO_PROC"]);
                    }
                }
            },

            setReorderReadMode() {
                var oTable = sap.ui.getCore().byId("reorderTab");
                var sColName = "";

                oTable.getColumns().forEach((col, idx) => {
                    if (col.mAggregations.template.mBindingInfos.text !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.text.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.selected !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.selected.parts[0].path;
                    }
                    else if (col.mAggregations.template.mBindingInfos.value !== undefined) {
                        sColName = col.mAggregations.template.mBindingInfos.value.parts[0].path;
                    }

                    if (sColName === "MATNO" || sColName === "REORDERQTY" || sColName === "REMARKS") {
                        col.setTemplate(new sap.m.Text({
                            text: "{" + sColName + "}",
                            wrapping: false,
                            tooltip: "{" + sColName + "}"
                        }));
                    }

                    if (sColName === "MATNO" || sColName === "REORDERQTY") {
                        col.getLabel().removeStyleClass("sapMLabelRequired");
                    }
                })

                this._ReorderDialog.getModel().getData().rows.forEach(item => item.EDITED = false);
            },

            onRefreshReorder: function (oEvent) {
                this.getReorderData(false, false);
            },

            onCloseReorder: function (oEvent) {
                this._ReorderDialog.close();

                if (this._bRefreshIOMatlist) this.onRefresh('ioMatList');
            },

            handleReorderValueHelp: function (oEvent) {
                var oSource = oEvent.getSource();
                var vh = this.getView().getModel("IOMATLIST_MODEL").getData();
                // console.log(vh)
                this._inputSource = oSource;
                this._inputId = oSource.getId();
                this._inputValue = oSource.getValue();
                this._inputField = oSource.getBindingInfo("value").parts[0].path;

                vh.forEach(item => {
                    item.VHTitle = item.MATNO;
                    item.VHDesc = item.SEQNO;
                    item.VHSelected = (item.MATNO === this._inputValue);
                })

                vh.sort((a, b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                var oVHModel = new JSONModel({
                    items: vh,
                    title: "Material No.",
                    table: "reorder"
                });

                // create value help dialog
                if (!this._valueHelpDialog) {
                    this._valueHelpDialog = sap.ui.xmlfragment(
                        "zuiio2.view.fragments.valuehelp.ValueHelpDialog",
                        this
                    );

                    this._valueHelpDialog.setModel(oVHModel);
                    this.getView().addDependent(this._valueHelpDialog);
                }
                else {
                    this._valueHelpDialog.setModel(oVHModel);
                }

                this._valueHelpDialog.open();
            },

            handleReorderValueHelpClose: function (oEvent) {
                if (oEvent.sId === "confirm") {
                    var oSelectedItem = oEvent.getParameter("selectedItem");

                    if (oSelectedItem) {
                        this._inputSource.setValue(oSelectedItem.getTitle());
                        // console.log("dumaan dito")
                        if (this._inputValue !== oSelectedItem.getTitle()) {
                            // console.log("dumaan dito")
                            var sRowPath = this._inputSource.getBindingInfo("value").binding.oContext.sPath;
                            // var sVendor = this.getView().getModel("IOMATLIST_MODEL").getData().filter(fItem => fItem.MATNO === oSelectedItem.getTitle() && fItem.SEQNO === oSelectedItem.getDescription())[0].VENDORCD;

                            this._ReorderDialog.getModel().setProperty(sRowPath + '/EDITED', true);
                            this._ReorderDialog.getModel().setProperty(sRowPath + '/SEQNO', oSelectedItem.getDescription());
                            // this._ReorderDialog.getModel().setProperty(sRowPath + '/VENDOR', sVendor);

                            var vUOM = "";
                            var vANDEC = 0;

                            this.getView().getModel("IOMATLIST_MODEL").getData().filter(fItem => fItem.SEQNO === oSelectedItem.getDescription()).forEach(item => vUOM = item.UOM);
                            this.getView().getModel("UOMConfig").getData().filter(fItem => fItem.MSEHI === vUOM).forEach(item => vANDEC = item.ANDEC);
                            // console.log(vUOM, vANDEC)
                            this._ReorderDialog.getModel().setProperty(sRowPath + '/UOM', vUOM);
                            this._ReorderDialog.getModel().setProperty(sRowPath + '/ANDEC', vANDEC);

                            this._bReorderChanged = true;
                        }
                    }

                    this._inputSource.setValueState("None");
                }
            },

            handleReorderValueHelpChange: function (oEvent) {
                var oSource = oEvent.getSource();
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                oSource.setValueState(isInvalid ? "Error" : "None");

                oSource.getSuggestionItems().forEach(item => {
                    if (item.getProperty("key") === oSource.getValue().trim()) {
                        isInvalid = false;
                        oSource.setValueState(isInvalid ? "Error" : "None");
                    }
                })

                if (isInvalid) this._validationErrors.push(oEvent.getSource().getId());
                else {
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }

                var sRowPath = oSource.getBindingInfo("value").binding.oContext.sPath;

                this._ReorderDialog.getModel().setProperty(sRowPath + '/EDITED', true);
                this._bReorderChanged = true;
            },

            handleSuggestionItemSelected: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedItem");
                var sRowPath = oEvent.getSource().getBindingInfo("value").binding.oContext.sPath;

                if (oSelectedItem !== null) {
                    // var sVendor = this.getView().getModel("IOMATLIST_MODEL").getData().filter(fItem => fItem.MATNO === oSelectedItem.getKey() && fItem.SEQNO === oSelectedItem.getAdditionalText())[0].VENDORCD;

                    this._ReorderDialog.getModel().setProperty(sRowPath + '/SEQNO', oSelectedItem.getAdditionalText());
                    // this._ReorderDialog.getModel().setProperty(sRowPath + '/VENDOR', sVendor);

                    var vUOM = "";
                    var vANDEC = 0;

                    this.getView().getModel("IOMATLIST_MODEL").getData().filter(fItem => fItem.SEQNO === oSelectedItem.getAdditionalText()).forEach(item => vUOM = item.UOM);
                    this.getView().getModel("UOMConfig").getData().filter(fItem => fItem.MSEHI === vUOM).forEach(item => vANDEC = item.ANDEC);
                    // console.log(vUOM, vANDEC)
                    this._ReorderDialog.getModel().setProperty(sRowPath + '/UOM', vUOM);
                    this._ReorderDialog.getModel().setProperty(sRowPath + '/ANDEC', vANDEC);
                }
                else {
                    this._ReorderDialog.getModel().setProperty(sRowPath + '/SEQNO', "");
                    // this._ReorderDialog.getModel().setProperty(sRowPath + '/VENDOR', "");
                    this._ReorderDialog.getModel().setProperty(sRowPath + '/UOM', "");
                    this._ReorderDialog.getModel().setProperty(sRowPath + '/ANDEC', 0);
                }

                this._ReorderDialog.getModel().setProperty(sRowPath + '/EDITED', true);
                this._bReorderChanged = true;
            },

            //******************************************* */
            // COSTING
            //******************************************* */            

            initIOCosting: function (oEvent) {
                // this._oModelIOCosting = this.getOwnerComponent().getModel("ZGW_3DERP_IOCOSTING_SRV");
                this._oModelIOCosting = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZGW_3DERP_IOCOSTING_SRV/");
                // this._aColumns = {};
                // this._aDataBeforeChange = [];
                var me = this;

                this._oModelIOCosting.read('/TypeSHSet', {
                    async: false,
                    success: function (oData) {
                        me.getView().setModel(new JSONModel(oData.results), "COSTTYPE_MODEL");
                    },
                    error: function (err) { }
                })

                this._oModelIOCosting.read('/SalesTermSet', {
                    success: function (oData) {
                        me.getView().setModel(new JSONModel(oData.results), "COSTTERMS_MODEL");
                    },
                    error: function (err) { }
                })

                this._oModelIOCosting.setHeaders({
                    PRODPLANT: this._prodplant
                })
                this._oModelIOCosting.read('/VariantSHSet', {
                    success: function (oData) {
                        me.getView().setModel(new JSONModel(oData.results), "COSTVARIANT_MODEL");

                        // sap.ui.getCore().byId("ETEXT").setValueAndText("01","CSVCD","DESC1",me.getView().getModel("COSTVARIANT_MODEL").getData());
                        // console.log(sap.ui.getCore().byId("ETEXT"));
                        // console.log(sap.ui.getCore().byId("ETEXT").getProperty("text"));
                        // console.log(sap.ui.getCore().byId("ETEXT").value);
                    },
                    error: function (err) { }
                })

                this.byId("costHdrTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                this.byId("costDtlsTab")
                    .setModel(new JSONModel({
                        columns: [],
                        rows: []
                    }));

                var vIONo = this._ioNo; //"1000115";

                this._oModelIOCosting.read('/VersionsSet', {
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "'"
                    },
                    success: function (oData) {
                        oData.results.forEach((row, index) => {
                            if (index === 0) {
                                row.ACTIVE = "X";
                                me.getIOCostDetails(row.CSTYPE, row.VERSION, false);
                            }
                            else row.ACTIVE = "";

                            row.CSDATE = dateFormat.format(new Date(row.CSDATE));
                        });

                        me.byId("costHdrTab").getModel().setProperty("/rows", oData.results);
                        me.byId("costHdrTab").bindRows("/rows");
                        me._tableRendered = "costHdrTab";
                    },
                    error: function (err) { }
                })

                //get column value help prop
                this.getIOCostingColumnProp();
            },

            getIOCostingColumnProp: async function () {
                var sPath = jQuery.sap.getModulePath("zuiio2", "/model/columns.json");

                var oModelColumns = new JSONModel();
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();

                //get dynamic columns based on saved layout or ZERP_CHECK
                setTimeout(() => {
                    this.getIOCostingDynamicColumns("IOCOSTHDR", "ZERP_IOCSHDR", "costHdrTab", oColumns);
                }, 100);

                setTimeout(() => {
                    this.getIOCostingDynamicColumns("IOCOSTDTL", "ZDV_3DERP_CSDTL", "costDtlsTab", oColumns);
                }, 100);
            },

            getIOCostingDynamicColumns(arg1, arg2, arg3, arg4) {
                var me = this;
                var sType = arg1;
                var sTabName = arg2;
                var sTabId = arg3;
                var oLocColProp = arg4;
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                var vSBU = this._sbu; //"VER"; //this.getView().getModel("ui").getData().sbu;

                oModel.setHeaders({
                    sbu: vSBU,
                    type: sType,
                    tabname: sTabName
                });

                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        if (oData.results.length > 0) {
                            // console.log(oData)
                            if (oLocColProp[sTabId.replace("Tab", "")] !== undefined) {
                                oData.results.forEach(item => {
                                    oLocColProp[sTabId.replace("Tab", "")].filter(loc => loc.ColumnName === item.ColumnName)
                                        .forEach(col => item.ValueHelp = col.ValueHelp)
                                })
                            }

                            me._aColumns[sTabId.replace("Tab", "")] = oData.results;
                            me.setIOCostingTableColumns(sTabId, oData.results);
                        }
                    },
                    error: function (err) {
                    }
                });
            },

            setIOCostingTableColumns(arg1, arg2) {
                var me = this;
                var sTabId = arg1;
                var oColumns = arg2;
                var oTable = this.getView().byId(sTabId);

                oTable.getModel().setProperty("/columns", oColumns);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnLabel = me.getStyleColumnDesc(sTabId, context.getObject()); //context.getObject().ColumnLabel;
                    var sColumnWidth = context.getObject().ColumnWidth;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnDataType = context.getObject().DataType;

                    if (sColumnWidth === 0) sColumnWidth = 100;

                    // var oColProp = me._aColumns[sTabId.replace("Tab", "")].filter(fItem => fItem.ColumnName === sColumnId);
                    var oText = new sap.m.Text({
                        wrapping: false,
                        tooltip: sColumnDataType === "BOOLEAN" ? "" : "{" + sColumnId + "}"
                    })

                    oText.bindText({
                        parts: [
                            { path: sColumnId }
                        ]
                    });

                    // if (oColProp && oColProp.length > 0 && oColProp[0].ValueHelp !== undefined) {
                    //     oText.bindText({  
                    //         parts: [  
                    //             { path: sColumnId }
                    //         ],  
                    //         formatter: function(sColumnId) {
                    //             if (oColProp[0].ValueHelp.items.value === oColProp[0].ValueHelp.items.text) return sColumnId;
                    //             else {
                    //                 var oValue = me.getView().getModel(oColProp[0].ValueHelp.items.path).getData().filter(v => v[oColProp[0].ValueHelp.items.value] === sColumnId);

                    //                 if (oValue && oValue.length > 0) {
                    //                     return oValue[0][oColProp[0].ValueHelp.items.text] + " (" + sColumnId + ")";
                    //                 }
                    //                 else return sColumnId;
                    //             }
                    //         }
                    //     });                        
                    // }
                    // else {
                    //     oText.bindText({  
                    //         parts: [  
                    //             { path: sColumnId }
                    //         ]
                    //     }); 
                    // }

                    return new sap.ui.table.Column({
                        id: sTabId.replace("Tab", "") + "Col" + sColumnId,
                        label: new sap.m.Text({ text: sColumnLabel, wrapping: true }),
                        template: oText,
                        width: sColumnWidth + "px",
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        hAlign: sColumnDataType === "NUMBER" ? "End" : sColumnDataType === "BOOLEAN" ? "Center" : "Begin",
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending")
                    });
                });

                // this._tableRendered = sTabId;
            },

            getIOCostDetails(arg1, arg2, arg3) {
                var me = this;
                var vIONo = this._ioNo

                if (this._ioNo === "NEW") vIONo = this.getView().getModel("ui2").getProperty("/currIONo");

                this._oModelIOCosting.read('/DetailsSet', {
                    urlParameters: {
                        "$filter": "IONO eq '" + vIONo + "' and CSTYPE eq '" + arg1 + "' and VERSION eq '" + arg2 + "'"
                    },
                    success: function (oData) {
                        if (arg3) { Common.closeProcessingDialog(me); }

                        oData.results.forEach(item => {
                            if (item.COSTCOMPCD === "NETBAL") { item.TOPSEQ = 1; }
                            else if (item.COSTCOMPCD === "% TO FOB") { item.TOPSEQ = 2; }
                            else { item.TOPSEQ = 100 + (+item.SEQNO) }
                        })

                        oData.results.sort((a, b) => (a.TOPSEQ > b.TOPSEQ ? 1 : -1));
                        // oData.results.sort((a, b) => (a.SEQNO > b.SEQNO ? 1 : -1));

                        oData.results.forEach((row, index) => {
                            row.ACTIVE = index === 0 ? "X" : "";
                        });

                        me.byId("costDtlsTab").getModel().setProperty("/rows", oData.results);
                        me.byId("costDtlsTab").bindRows("/rows");
                        me._tableRendered = "costDtlsTab";
                    },
                    error: function (err) {
                        Common.closeProcessingDialog(me);
                    }
                })
            },

            onCreateCosting: function (oEvent) {
                var me = this;
                var today = new Date();

                var aCreateCostingModel = {
                    data: {
                        CSTYPE: "",
                        CSVCD: "",
                        VERDESC: "",
                        SALESTERM: "",
                        CSDATE: "",
                        COSTSTATUS: ""
                    },
                    ddtext: this.getView().getModel("ddtext").getData()
                }

                // var oJSONModel = new JSONModel();
                // oJSONModel.setData(this.getView().getModel("ddtext").getData(), "ddtext");

                this._oModelIOCosting.read('/TypeSHSet', {
                    success: function (oData) {
                        me.getView().setModel(new JSONModel(oData.results), "COSTTYPE_MODEL");
                    },
                    error: function (err) { }
                })

                this._oModelIOCosting.read('/SalesTermSet', {
                    success: function (oData) {
                        me.getView().setModel(new JSONModel(oData.results), "COSTTERMS_MODEL");
                    },
                    error: function (err) { }
                })

                this._oModelIOCosting.setHeaders({
                    PRODPLANT: this._prodplant
                })
                this._oModelIOCosting.read('/VariantSHSet', {
                    success: function (oData) {
                        me.getView().setModel(new JSONModel(oData.results), "COSTVARIANT_MODEL");

                        // sap.ui.getCore().byId("ETEXT").setValueAndText("01","CSVCD","DESC1",me.getView().getModel("COSTVARIANT_MODEL").getData());
                        // console.log(sap.ui.getCore().byId("ETEXT"));
                        // console.log(sap.ui.getCore().byId("ETEXT").getProperty("text"));
                        // console.log(sap.ui.getCore().byId("ETEXT").value);
                    },
                    error: function (err) { }
                })

                if (!this._CreateCostingDialog) {
                    this._CreateCostingDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.CreateCostingDialog", this);
                    this._CreateCostingDialog.setModel(new JSONModel(aCreateCostingModel));
                    this.getView().addDependent(this._CreateCostingDialog);
                }
                else {
                    this._CreateCostingDialog.setModel(new JSONModel(aCreateCostingModel));
                }

                this._CreateCostingDialog.setTitle(this.getView().getModel("ddtext").getData()["CREATECOSTING"]);
                this._CreateCostingDialog.open();
                this._validationErrors = [];
            },

            beforeOpenCreateCosting: function (oEvent) {
                oEvent.getSource().setInitialFocus(sap.ui.getCore().byId("CSTYPE"));

                sap.ui.getCore().byId("COSTSTATUS").setValue("CRT");
                sap.ui.getCore().byId("VERDESC").setValue("");

                //set CS DATE value to today's date
                var today = new Date();
                sap.ui.getCore().byId("CSDATE").setValue(sapDateFormat.format(today));

                if (this.getView().byId("CUSSALTERM").getValue() !== "") {
                    sap.ui.getCore().byId("SALESTERM").setValue(this.getView().byId("CUSSALTERM").getValue());
                }
                else {
                    //set value of fields if resource has only 1 data
                    if (this.getView().getModel("COSTTERMS_MODEL").getData().length === 1) { sap.ui.getCore().byId("SALESTERM").setValue(this.getView().getModel("COSTTERMS_MODEL").getData()[0].INCO1); }
                    else { sap.ui.getCore().byId("SALESTERM").setValue(""); }
                }

                //set value of fields if resource has only 1 data
                if (this.getView().getModel("COSTTYPE_MODEL").getData().length === 1) {
                    sap.ui.getCore().byId("CSTYPE").setValue(this.getView().getModel("COSTTYPE_MODEL").getData()[0].CSTYPECD);

                    //get default value
                    var aDef = this.getView().getModel("COSTVARIANT_MODEL").getData().filter(item => item.ZDEFAULT === "X");

                    if (aDef.length > 0) {
                        sap.ui.getCore().byId("CSVCD").setValue(aDef[0].CSVCD);

                        if (aDef[0].AUTOAPRV === "X") sap.ui.getCore().byId("COSTSTATUS").setValue("REL");
                    }
                    // else {
                    //     //set value of fields if resource has only 1 data
                    //     if (this.getView().getModel("COSTVARIANT_MODEL").getData().length === 1) { sap.ui.getCore().byId("CSVCD").setValue(this.getView().getModel("COSTVARIANT_MODEL").getData()[0].CSVCD); }
                    //     else { sap.ui.getCore().byId("CSVCD").setValue(""); }    
                    // }                    
                }
                else {
                    sap.ui.getCore().byId("CSTYPE").setValue("");
                    sap.ui.getCore().byId("CSVCD").setValue("");
                }
                // console.log(sapDateFormat.format("11/28/2022"))
            },

            afterOpenCreateCosting: function (oEvent) {
                oEvent.getSource().setInitialFocus(sap.ui.getCore().byId("CSTYPE"));

                // //set value of fields if resource has only 1 data
                // if (this.getView().getModel("COSTTYPE_MODEL").getData().length === 1)
                // { sap.ui.getCore().byId("CSTYPE").setValue(this.getView().getModel("COSTTYPE_MODEL").getData()[0].CSTYPECD); }
                // else { sap.ui.getCore().byId("CSTYPE").setValue(""); }

                // if (this.getView().getModel("COSTVARIANT_MODEL").getData().length === 1)
                // { sap.ui.getCore().byId("CSVCD").setValue(this.getView().getModel("COSTVARIANT_MODEL").getData()[0].CSVCD); }
                // else { sap.ui.getCore().byId("CSVCD").setValue(""); }

                // if (this.getView().getModel("COSTTERMS_MODEL").getData().length === 1)
                // { sap.ui.getCore().byId("SALESTERM").setValue(this.getView().getModel("COSTTERMS_MODEL").getData()[0].INCO1); }
                // else { sap.ui.getCore().byId("SALESTERM").setValue(""); }

                // sap.ui.getCore().byId("VERDESC").setValue("");
            },

            onSaveCreateCosting: function (oEvent) {
                var me = this;
                var oParam = {
                    "IONO": this._ioNo,
                    "CSTYPE": sap.ui.getCore().byId("CSTYPE").getSelectedKey(),
                    "CSVCD": sap.ui.getCore().byId("CSVCD").getSelectedKey(),
                    "VERDESC": sap.ui.getCore().byId("VERDESC").getValue(),
                    "SALESTERM": sap.ui.getCore().byId("SALESTERM").getValue(),
                    "CSDATE": sap.ui.getCore().byId("CSDATE").getValue().toString() + "T00:00:00",
                    "COSTSTATUS": sap.ui.getCore().byId("COSTSTATUS").getValue()
                }
                // console.log(oParam);

                Common.openProcessingDialog(this, "Processing...");

                this._oModelIOCosting.create('/VersionsSet', oParam, {
                    method: "POST",
                    success: function (oCreateData) {
                        me._oModelIOCosting.read('/VersionsSet', {
                            urlParameters: {
                                "$filter": "IONO eq '" + me._ioNo + "'"
                            },
                            success: function (oReadData) {
                                Common.openProcessingDialog(me);

                                oReadData.results.forEach((row, index) => {
                                    if ((index + 1) === oReadData.results.length) {
                                        row.ACTIVE = "X";
                                        me.getIOCostDetails(row.CSTYPE, row.VERSION, true);
                                    }
                                    else row.ACTIVE = "";
                                });

                                me.byId("costHdrTab").getModel().setProperty("/rows", oReadData.results);
                                me.byId("costHdrTab").bindRows("/rows");
                                me._tableRendered = "costHdrTab";
                                me._CreateCostingDialog.close();
                            },
                            error: function (err) { }
                        })
                    },
                    error: function (err) { }
                })
            },

            onCancelCreateCosting: function (oEvent) {
                var oData = {
                    Action: "createcosting-cancel",
                    Text: this.getView().getModel("ddtext").getData()["CONFIRM_DISREGARD_CHANGE"]
                }

                if (!this._ConfirmDialog) {
                    this._ConfirmDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.ConfirmDialog", this);

                    this._ConfirmDialog.setModel(new JSONModel(oData));
                    this.getView().addDependent(this._ConfirmDialog);
                }
                else this._ConfirmDialog.setModel(new JSONModel(oData));

                this._ConfirmDialog.open();
            },

            handleValueHelpCosting: function (oEvent) {
                var me = this;
                var oSource = oEvent.getSource();
                var sModel = oSource.getBindingInfo("suggestionItems").model;
                var vh = this.getView().getModel(sModel).getData();
                var sVHTitle = oSource.getBindingInfo("suggestionItems").template.getBindingInfo("key").parts[0].path;
                var sVHDesc = sVHTitle;
                var sTextFormatMode = oSource.getProperty("textFormatMode");

                this._inputSource = oSource;
                this._inputId = oSource.getId();
                this._inputValue = oSource.getValue();

                if (oSource.getBindingInfo("suggestionItems").template.getBindingInfo("additionalText") !== undefined) {
                    sVHDesc = oSource.getBindingInfo("suggestionItems").template.getBindingInfo("text").parts[0].path

                    vh.forEach(item => {
                        item.VHTitle = item[sVHTitle];
                        item.VHDesc = sVHTitle === sVHDesc ? "" : item[sVHDesc];
                        item.VHSelected = (item[sVHTitle] === this._inputValue);
                    })
                }
                else {
                    vh.forEach(item => {
                        item.VHTitle = item[sVHTitle];
                        item.VHDesc = sVHTitle === sVHDesc ? "" : item[sVHDesc];
                    })
                }

                vh.forEach(item => {
                    if (sTextFormatMode === "Key") {
                        item.VHSelected = this._inputValue === item[sVHTitle];
                    }
                    else if (sTextFormatMode === "Value") {
                        item.VHSelected = this._inputValue === (sVHTitle === sVHDesc ? item[sVHTitle] : item[sVHDesc]);
                    }
                    else if (sTextFormatMode === "KeyValue") {
                        item.VHSelected = this._inputValue === (item[sVHTitle] + " (" + item[sVHDesc] + ")");
                    }
                    else if (sTextFormatMode === "ValueKey") {
                        item.VHSelected = this._inputValue === (item[sVHDesc] + " (" + item[sVHTitle] + ")");
                    }

                    if (item.VHSelected) { this._inputKey = item[sVHTitle]; }
                })

                vh.sort((a, b) => (a.VHTitle > b.VHTitle ? 1 : -1));

                var oVHModel = new JSONModel({
                    items: vh,
                    title: this._inputId,
                    table: sModel,
                    process: "CREATECOSTING"
                });

                // create value help dialog
                if (!this._valueHelpDialog) {
                    this._valueHelpDialog = sap.ui.xmlfragment(
                        "zuiio2.view.fragments.valuehelp.ValueHelpDialog",
                        this
                    );

                    this._valueHelpDialog.setModel(oVHModel);
                    this.getView().addDependent(this._valueHelpDialog);
                }
                else {
                    this._valueHelpDialog.setModel(oVHModel);
                }

                this._valueHelpDialog.open();
            },

            handleValueHelpCloseCosting(arg) {
                if (arg.sId === "confirm") {
                    var oSelectedItem = arg.getParameter("selectedItem");

                    if (oSelectedItem) {
                        // this._inputSource.setValue(oSelectedItem.getTitle());
                        this._inputSource.setSelectedKey(oSelectedItem.getTitle());

                        if (this._inputId === "CSTYPE") {
                            var aDef = [];
                            var oHdrData = this.getView().getModel("headerData").getData();
                            var sCustDlvDt = "";

                            //get default value option 1
                            this.getView().getModel("COSTVARIANT_MODEL").getData().forEach(item => {
                                if (!(item.EFFECTDT === null || item.EFFECTDT === "")) {
                                    aDef.push(item);
                                }
                            })

                            if (!(oHdrData.REVCUSTDLVDT === "" || oHdrData.REVCUSTDLVDT === null || oHdrData.REVCUSTDLVDT === "0000-00-00")) {
                                sCustDlvDt = oHdrData.REVCUSTDLVDT;
                            }
                            else if (!(oHdrData.CUSTDLVDT === "" || oHdrData.CUSTDLVDT === null || oHdrData.CUSTDLVDT === "0000-00-00")) {
                                sCustDlvDt = oHdrData.CUSTDLVDT;
                            }

                            if (aDef.length > 0 && sCustDlvDt !== "") {
                                if (aDef.length > 1) {
                                    if (this.getView().getModel("COSTVARIANT_MODEL").getData().filter(item => item.ZDEFAULT === "X").length > 0) {
                                        aDef = this.getView().getModel("COSTVARIANT_MODEL").getData().filter(item => item.ZDEFAULT === "X");
                                    };

                                    if (new Date(sCustDlvDt) >= new Date(aDef[0].EFFECTDT)) {
                                        // sap.ui.getCore().byId("CSVCD").setValue(aDef[0].CSVCD);
                                        sap.ui.getCore().byId("CSVCD").setSelectedKey(aDef[0].CSVCD);

                                        if (aDef[0].AUTOAPRV === "X") sap.ui.getCore().byId("COSTSTATUS").setValue("REL");
                                    }
                                }
                            }
                            else {
                                //get default value option 2
                                aDef = this.getView().getModel("COSTVARIANT_MODEL").getData().filter(item => item.ZDEFAULT === "X");

                                if (aDef.length > 0) {
                                    // sap.ui.getCore().byId("CSVCD").setValue(aDef[0].CSVCD);
                                    sap.ui.getCore().byId("CSVCD").setSelectedKey(aDef[0].CSVCD);

                                    if (aDef[0].AUTOAPRV === "X") sap.ui.getCore().byId("COSTSTATUS").setValue("REL");
                                }
                            }
                        }
                    }

                    this._inputSource.setValueState("None");
                }
            },

            handleValueHelpChangeCosting: function (oEvent) {
                var oSource = oEvent.getSource();
                var isInvalid = !oSource.getSelectedKey() && oSource.getValue().trim();
                oSource.setValueState(isInvalid ? "Error" : "None");

                oSource.getSuggestionItems().forEach(item => {
                    if (item.getProperty("key") === oSource.getValue().trim()) {
                        isInvalid = false;
                        oSource.setValueState(isInvalid ? "Error" : "None");
                    }
                })

                if (isInvalid) this._validationErrors.push(oEvent.getSource().getId());
                else {
                    this._validationErrors.forEach((item, index) => {
                        if (item === oEvent.getSource().getId()) {
                            this._validationErrors.splice(index, 1)
                        }
                    })
                }

                // console.log(this._validationErrors);
            },

            onReleaseCosting: function (oEvent) {
                var me = this;
                var oTable = oEvent.getSource().oParent.oParent;
                var oData = oTable.getModel().getData().rows;

                if (oData.length > 0) {
                    var vStatus = this.byId("costHdrTab").getModel().getData().rows.filter(fi => fi.CSTYPE === oData[0].CSTYPE && fi.VERSION === oData[0].VERSION)[0].COSTSTATUS;

                    if (vStatus === "REL") {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_STATUS_ALREADY_REL"]);
                    }
                    else {
                        Common.openProcessingDialog(me, "Processing");

                        this._oModelIOCosting.update("/VersionsSet(IONO='" + oData[0].IONO + "',CSTYPE='" + oData[0].CSTYPE + "',VERSION='" + oData[0].VERSION + "')", { COSTSTATUS: "ACTION-REL" }, {
                            method: "PUT",
                            success: function (data, oResponse) {
                                Common.closeProcessingDialog(me);
                                MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_COSTING_RELEASE"]);

                                me._oModelIOCosting.read('/VersionsSet', {
                                    urlParameters: {
                                        "$filter": "IONO eq '" + oData[0].IONO + "'"
                                    },
                                    success: function (oData) {
                                        me.byId("costHdrTab").getModel().getData().rows.filter(fItem => fItem.ACTIVE === "X")
                                            .forEach(item => {
                                                oData.results.filter(fItem2 => fItem2.CSTYPE === item.CSTYPE && fItem2.VERSION === item.VERSION)
                                                    .forEach(item2 => item2.ACTIVE = "X")
                                            })

                                        oData.results.forEach((row, index) => {
                                            row.CSDATE = dateFormat.format(new Date(row.CSDATE));
                                        });

                                        me.byId("costHdrTab").getModel().setProperty("/rows", oData.results);
                                        me.byId("costHdrTab").bindRows("/rows");
                                        // me._tableRendered = "costHdrTab";
                                    },
                                    error: function (err) {
                                        Common.closeProcessingDialog(me);
                                    }
                                })
                            },
                            error: function (err) {
                                Common.closeProcessingDialog(me);
                            }
                        });
                    }
                }
                else {
                    MessageBox.information(me.getView().getModel("ddtext").getData()["INFO_NO_DATA_TO_PROC"]);
                }
            },

            onRefresh(arg) {
                var me = this;
                var vIONo = this._ioNo

                // console.log(vIONo);

                if (this._ioNo === "NEW") vIONo = this.getView().getModel("ui2").getProperty("/currIONo");

                // this._aColFilters = this.byId(arg + "Tab").getBinding("rows").aFilters;
                // this._aColSorters = this.byId(qrg + "Tab").getBinding("rows").aSorters;

                if (arg === "ioMatList") {
                    Common.openProcessingDialog(this, "Processing...");
                    this._aColFilters = this.byId(arg + "Tab").getBinding("rows").aFilters;
                    this._aColSorters = this.byId(arg + "Tab").getBinding("rows").aSorters;

                    this._oModelIOMatList.setHeaders({
                        SBU: this._sbu,
                        PRODPLANT: this._prodplant
                    });
                    // console.log(this._sbu, this._prodplant, vIONo)
                    this._oModelIOMatList.read('/MainSet', {
                        urlParameters: {
                            "$filter": "IONO eq '" + vIONo + "'"
                        },
                        success: function (oData, response) {
                            Common.closeProcessingDialog(me);
                            oData.results.sort((a, b) => (a.SEQNO > b.SEQNO ? 1 : -1));
                            oData.results.forEach((row, index) => {
                                row.ACTIVE = index === 0 ? "X" : "";
                                row.POQTY = row.POQTY + "";
                                row.INDCQTY = row.INDCQTY + "";
                                row.ISSTOPROD = row.ISSTOPROD + "";
                                row.MITQTY = row.MITQTY + "";
                                row.MRPQTY = row.MRPQTY + "";
                                row.MRTRANSFERQTY = row.MRTRANSFERQTY + "";
                                row.PLANTAVAILQTY = row.PLANTAVAILQTY + "";
                                row.PRQTY = row.PRQTY + "";
                                row.VARIANCE = row.VARIANCE + "";
                                row.DELETED = row.DELETED === "X" ? true : false;
                            });

                            me.byId(arg + "Tab").getModel().setProperty("/rows", oData.results);
                            me.byId(arg + "Tab").bindRows("/rows");
                            me._tableRendered = (arg + "Tab");

                            me._oModelIOMatList.read('/InfoRecCheckSet', {
                                success: function (oData2) {
                                    me.getView().getModel("matTypInfoRecChk").setProperty("/", oData2.results);
                                },
                                error: function (err) { }
                            })
                            // setTimeout(() => {
                            //     me.byId(arg + "Tab").getRows()[0].addStyleClass("activeRow");
                            // }, 50);
                        },
                        error: function (err) {
                            Common.closeProcessingDialog(me);
                        }
                    })
                }
                else if (arg === "costHdr") {
                    Common.openProcessingDialog(this, "Processing...");
                    this._aColFilters = this.byId(arg + "Tab").getBinding("rows").aFilters;
                    this._aColSorters = this.byId(arg + "Tab").getBinding("rows").aSorters;

                    this._oModelIOCosting.read('/VersionsSet', {
                        urlParameters: {
                            "$filter": "IONO eq '" + vIONo + "'"
                        },
                        success: function (oData) {
                            oData.results.forEach((row, index) => {
                                if (index === 0) {
                                    row.ACTIVE = "X";
                                    me.getIOCostDetails(row.CSTYPE, row.VERSION, true);
                                }
                                else row.ACTIVE = "";

                                row.CSDATE = dateFormat.format(new Date(row.CSDATE));
                            });

                            me.byId("costHdrTab").getModel().setProperty("/rows", oData.results);
                            me.byId("costHdrTab").bindRows("/rows");
                            me._tableRendered = "costHdrTab";
                        },
                        error: function (err) {
                            Common.closeProcessingDialog(me);
                        }
                    })
                }
                else if (arg === "costDtls") {
                    this._aColFilters = this.byId(arg + "Tab").getBinding("rows").aFilters;
                    this._aColSorters = this.byId(arg + "Tab").getBinding("rows").aSorters;

                    if (this.byId("costHdrTab").getModel().getData().rows.length === 0) {
                        MessageBox.information(this.getView().getModel("ddtext").getData()["INFO_NO_DATA_TO_REFRESH"]);
                    }
                    else {
                        var activeCostHdrData = this.byId("costHdrTab").getModel().getData().rows.filter(fItem => fItem.ACTIVE === "X");
                        // console.log(activeCostHdrData[0].CSTYPE, activeCostHdrData[0].VERSION);
                        Common.openProcessingDialog(this, "Processing...");
                        this.getIOCostDetails(activeCostHdrData[0].CSTYPE, activeCostHdrData[0].VERSION, true);
                    }
                }
                else if (arg === "size") {
                    Common.openProcessingDialog(this, "Processing...");
                    this._aColFilters = this.byId(arg + "Tab").getBinding("rows").aFilters;
                    this._aColSorters = this.byId(arg + "Tab").getBinding("rows").aSorters;

                    this._oModelStyle.read('/AttribSet', {
                        urlParameters: {
                            "$filter": "IONO eq '" + vIONo + "' and ATTRIBTYP eq 'SIZE'"
                        },
                        success: function (oData, response) {
                            oData.results.forEach((item, index) => {
                                item.ACTIVE = index === 0 ? "X" : "";
                                item.BASEIND = item.BASEIND === "X" ? true : false;
                                item.DELETED = item.DELETED === "X" ? true : false;
                            });

                            me.byId("sizeTab").getModel().setProperty("/rows", oData.results);
                            me.byId("sizeTab").bindRows("/rows");
                            me._tableRendered = "sizeTab";

                            Common.closeProcessingDialog(me)
                                ;
                        },
                        error: function (err) { }
                    })
                }
                else if (arg === "color") {
                    Common.openProcessingDialog(this, "Processing...");
                    this._aColFilters = this.byId(arg + "Tab").getBinding("rows").aFilters;
                    this._aColSorters = this.byId(arg + "Tab").getBinding("rows").aSorters;

                    this._oModelStyle.read('/AttribSet', {
                        urlParameters: {
                            "$filter": "IONO eq '" + vIONo + "' and ATTRIBTYP eq 'COLOR'"
                        },
                        success: function (oData, response) {
                            oData.results.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");
                            me.byId("colorTab").getModel().setProperty("/rows", oData.results);
                            me.byId("colorTab").bindRows("/rows");
                            me._tableRendered = "colorTab";
                            Common.closeProcessingDialog(me)
                        },
                        error: function (err) { }
                    })
                }
                else if (arg === "process") {
                    Common.openProcessingDialog(this, "Processing...");
                    this._aColFilters = this.byId(arg + "Tab").getBinding("rows").aFilters;
                    this._aColSorters = this.byId(arg + "Tab").getBinding("rows").aSorters;

                    this._oModelStyle.read('/ProcessSet', {
                        urlParameters: {
                            "$filter": "IONO eq '" + vIONo + "'"
                        },
                        success: function (oData, response) {
                            oData.results.forEach((item, index) => item.ACTIVE = index === 0 ? "X" : "");
                            me.byId("processTab").getModel().setProperty("/rows", oData.results);
                            me.byId("processTab").bindRows("/rows");
                            me._tableRendered = "processTab";
                            Common.closeProcessingDialog(me)
                        },
                        error: function (err) { }
                    })
                }
            },

            onTableResize(arg1, arg2) {
                // console.log(arg1, arg2)
                this._tableRendered = "";

                if (arg1 === "ioMatList") {
                    if (arg2 === "max") {
                        this.byId("objectHeader").setVisible(false);
                        this.byId("btnFullScreenIOMatList").setVisible(false);
                        this.byId("btnExitFullScreenIOMatList").setVisible(true);
                    }
                    else if (arg2 === "min") {
                        this.byId("objectHeader").setVisible(true);
                        this.byId("btnFullScreenIOMatList").setVisible(true);
                        this.byId("btnExitFullScreenIOMatList").setVisible(false);
                    }

                    this._tableRendered = "ioMatListTab";
                }
                else if (arg1 === "IODLV") {
                    if (arg2 === "max") {
                        this.byId("objectHeader").setVisible(false);
                        this.byId("btnFullScreenDlvSched").setVisible(false);
                        this.byId("btnExitFullScreenDlvSched").setVisible(true);
                        this.byId("IODETTab").setVisible(false);
                    }
                    else if (arg2 === "min") {
                        this.byId("objectHeader").setVisible(true);
                        this.byId("btnFullScreenDlvSched").setVisible(true);
                        this.byId("btnExitFullScreenDlvSched").setVisible(false);
                        this.byId("IODETTab").setVisible(true);
                    }

                    this._tableRendered = "IODLVTab";
                }
                else if (arg1 === "IODET") {
                    if (arg2 === "max") {
                        this.byId("objectHeader").setVisible(false);
                        this.byId("btnFullScreenIODet").setVisible(false);
                        this.byId("btnExitFullScreenIODet").setVisible(true);
                        this.byId("IODLVTab").setVisible(false);
                    }
                    else if (arg2 === "min") {
                        this.byId("objectHeader").setVisible(true);
                        this.byId("btnFullScreenIODet").setVisible(true);
                        this.byId("btnExitFullScreenIODet").setVisible(false);
                        this.byId("IODLVTab").setVisible(true);
                    }

                    this._tableRendered = "IODETTab";
                }

                // if (arg1 === "ioDet") {
                //     if (arg2 === "max") {
                //         this.byId("idIconTabBarInlineIODET").setVisible(false);
                //         this.byId("btnFullScreenIODet").setVisible(false);
                //         this.byId("btnExitFullScreenIODet").setVisible(true);
                //     }
                //     else if (arg2 === "min") {
                //         this.byId("idIconTabBarInlineIODET").setVisible(true);
                //         this.byId("btnFullScreenIODet").setVisible(true);
                //         this.byId("btnExitFullScreenIODet").setVisible(false);
                //     }

                //     this._tableRendered = "IODETTab";
                // }
            },

            onCellClick: function (oEvent) {
                if (oEvent.getParameters().rowBindingContext) {
                    var oTable = oEvent.getSource(); //this.byId("ioMatListTab");
                    var sRowPath = oEvent.getParameters().rowBindingContext.sPath;

                    if (oTable.getId().indexOf("costHdrTab") >= 0) {
                        var vType = oTable.getModel().getProperty(sRowPath + "/CSTYPE");
                        var vVersion = oTable.getModel().getProperty(sRowPath + "/VERSION");
                        this.getIOCostDetails(vType, vVersion, false);
                    }

                    oTable.getModel().getData().rows.forEach(row => row.ACTIVE = "");
                    oTable.getModel().setProperty(sRowPath + "/ACTIVE", "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext() && row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.replace("/rows/", "")) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow")
                    })
                }
            },

            onSort: function (oEvent) {
                var oTable = oEvent.getSource();
                this.setActiveRowHighlightByTable(oTable);
            },

            onFilter: function (oEvent) {
                var oTable = oEvent.getSource();
                this.setActiveRowHighlightByTable(oTable);
            },

            onFirstVisibleRowChanged: function (oEvent) {
                var oTable = oEvent.getSource();
                var sTableId = oTable.getId();

                // console.log("onFirstVisibleRowChanged");
                // console.log(oTable);

                setTimeout(() => {
                    var oData = [];

                    if (sTableId.indexOf("styleBOMUVTab") >= 0) oData = oTable.getModel("DataModel").getData().results;
                    else if (sTableId.indexOf("styleFabBOMTab") >= 0 || sTableId.indexOf("styleAccBOMTab") >= 0) oData = oTable.getModel("DataModel").getData().results.items;
                    else oData = oTable.getModel().getData().rows;

                    var iStartIndex = oTable.getBinding("rows").iLastStartIndex;
                    var iLength = oTable.getBinding("rows").iLastLength + iStartIndex;

                    if (oTable.getBinding("rows").aIndices.length > 0) {
                        for (var i = iStartIndex; i < iLength; i++) {
                            var iDataIndex = oTable.getBinding("rows").aIndices.filter((fItem, fIndex) => fIndex === i);

                            if (oData[iDataIndex].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                    else {
                        for (var i = iStartIndex; i < iLength; i++) {
                            if (oData[i].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                }, 1);
            },

            onColumnUpdated: function (oEvent) {
                var oTable = oEvent.getSource();
                this.setActiveRowHighlightByTable(oTable);
            },

            onKeyUp(oEvent) {
                if ((oEvent.key === "ArrowUp" || oEvent.key === "ArrowDown") && oEvent.srcControl.sParentAggregationName === "rows") {
                    var oControl = this._sTableModel === "reorder" ? sap.ui.getCore().byId(oEvent.srcControl.sId) : this.byId(oEvent.srcControl.sId);
                    var oTable = oControl.oParent;

                    if (oControl.getBindingContext()) {
                        var sRowPath = oControl.getBindingContext().sPath;

                        oTable.getModel().getData().rows.forEach(row => row.ACTIVE = "");
                        oTable.getModel().setProperty(sRowPath + "/ACTIVE", "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext() && row.getBindingContext().sPath.replace("/rows/", "") === sRowPath.replace("/rows/", "")) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow")
                        })
                    }
                }
                else if (oEvent.key === "Enter" && oEvent.srcControl.sParentAggregationName === "cells") {
                    if (this._dataMode === "NEW" && this._sTableModel === "reorder") {
                        this.addReorder();
                    }
                }
            },

            onAfterTableRendering: function (oEvent) {
                if (this._tableRendered !== "") {
                    this.setActiveRowHighlightByTableId(this._tableRendered);
                    this._tableRendered = "";
                }
            },

            setActiveRowHighlightByTable(arg) {
                var oTable = arg;
                var sTableId = oTable.getId();

                setTimeout(() => {
                    if (sTableId.indexOf("styleBOMUVTab") >= 0) {
                        var iActiveRowIndex = oTable.getModel("DataModel").getData().results.findIndex(item => item.ACTIVE === "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext("DataModel") && +row.getBindingContext("DataModel").sPath.replace("/results/", "") === iActiveRowIndex) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow");
                        })
                    }
                    else if (sTableId.indexOf("styleFabBOMTab") >= 0 || sTableId.indexOf("styleAccBOMTab") >= 0) {
                        var iActiveRowIndex = oTable.getModel("DataModel").getData().results.items.findIndex(item => item.ACTIVE === "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext("DataModel") && +row.getBindingContext("DataModel").sPath.replace("/results/items/", "") === iActiveRowIndex) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow");
                        })
                    }
                    else {
                        var iActiveRowIndex = oTable.getModel().getData().rows.findIndex(item => item.ACTIVE === "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext() && +row.getBindingContext().sPath.replace("/rows/", "") === iActiveRowIndex) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow");
                        })
                    }
                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext() && +row.getBindingContext().sPath.replace("/rows/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }, 1);
            },

            setActiveRowHighlightByTableId(arg) {
                var oTable = arg === "reorderTab" ? sap.ui.getCore().byId("reorderTab") : this.byId(arg);
                var sTableId = oTable.getId();

                setTimeout(() => {

                    // if(sTableId.indexOf("styleBOMUVTab") >= 0){
                    //     console.log("IO Attrib Data Model");
                    //     console.log(oTable);
                    //     return;
                    // }

                    // console.log(oTable);
                    // console.log(arg);

                    if (sTableId.indexOf("styleBOMUVTab") >= 0) {
                        var iActiveRowIndex = oTable.getModel("DataModel").getData().results.findIndex(item => item.ACTIVE === "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext("DataModel") && +row.getBindingContext("DataModel").sPath.replace("/results/", "") === iActiveRowIndex) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow");
                        })
                    }
                    else if (sTableId.indexOf("styleFabBOMTab") >= 0 || sTableId.indexOf("styleAccBOMTab") >= 0) {
                        var iActiveRowIndex = oTable.getModel("DataModel").getData().results.items.findIndex(item => item.ACTIVE === "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext("DataModel") && +row.getBindingContext("DataModel").sPath.replace("/results/items/", "") === iActiveRowIndex) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow");
                        })
                    } else if (sTableId.indexOf("IODLVTab") >= 0) {
                        var iActiveRowIndex = oTable.getModel().getData().rows.findIndex(item => item.ACTIVE === "X");
                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext() && +row.getBindingContext().sPath.replace("/rows/", "") === iActiveRowIndex) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow");
                        })

                    } else if (sTableId.indexOf("IODETTab") >= 0) {
                        // console.log(oTable);
                        var iActiveRowIndex = oTable.getModel("DataModel").getData().results.findIndex(item => item.ACTIVE === "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext("DataModel") && +row.getBindingContext("DataModel").sPath.replace("/results/", "") === iActiveRowIndex) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow");
                        })
                    } else {
                        var iActiveRowIndex = oTable.getModel().getData().rows.findIndex(item => item.ACTIVE === "X");
                        // console.log(iActiveRowIndex)
                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext() && +row.getBindingContext().sPath.replace("/rows/", "") === iActiveRowIndex) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow");
                        })
                    }
                }, 10);
            },

            onExport: Utils.onExport,

            //******************************************* */
            // FA Summary
            //******************************************* */

            onFADCReceiveDtl: FASummary.onFADCReceiveDtl,
            onFADCSendDtl: FASummary.onFADCSendDtl,
            onExportFASummary: FASummary.onExportFASummary,
            onRefreshFASummary: FASummary.onRefreshFASummary,
            onCellClickFASummary: FASummary.onCellClickFASummary,
            onFirstVisibleRowChangedFASummary: FASummary.onFirstVisibleRowChanged,
            onColumnUpdatedFASummary: FASummary.onColumnUpdated,
            onFADCReceiveDetailClose: FASummary.onFADCReceiveDetailClose,
            onFADCSendDetailClose: FASummary.onFADCSendDetailClose,

            //******************************************* */
            // Attachments
            //******************************************* */

            appendUploadCollection: function () {
                //set properties and adding the attachments component to the screen
                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.attachChange(that.onFileSelected);
                oUploadCollection.setMode(sap.m.ListMode.SingleSelectLeft);
                oUploadCollection.attachBeforeUploadStarts(that.onBeforeUploadStarts);
                //oUploadCollection.attachChange(that.onUploadChange);
                oUploadCollection.setMultiple(true);
                //set the odata path of the upload collection
                oUploadCollection.setUploadUrl("/sap/opu/odata/sap/ZGW_3DERP_FILES_SRV/FileIOSet");
                //attach function when an upload is completed
                oUploadCollection.attachUploadComplete(that.onUploadComplete);
                oUploadCollection.setMode(sap.m.ListMode.None);
            },

            bindUploadCollection: function () {
                var oUploadCollection = this.getView().byId('UploadCollection');
                //setting the properties of the upload collection and binding
                oUploadCollection.bindItems({
                    path: 'FileModel>/FileIOSet',
                    filters: [
                        new sap.ui.model.Filter("Iono", sap.ui.model.FilterOperator.EQ, that._ioNo)
                    ],
                    template: new sap.m.UploadCollectionItem({
                        documentId: "{FileModel>Iono}",
                        fileName: "{FileModel>Filename}",
                        // url: "/sap/opu/odata/sap/ZGW_3DERP_FILES_SRV/FileIOSet(guid'{FileModel>Iono}')/$value",
                        // url: "/sap/opu/odata/sap/ZGW_3DERP_FILES_SRV/FileIOSet(Mandt='888',Sbu='VER',Iono='1000115',Seqno='3')/$value",
                        url: "/sap/opu/odata/sap/ZGW_3DERP_FILES_SRV/FileIOSet(Mandt='{FileModel>Mandt}',Sbu='{FileModel>Sbu}',Iono='{FileModel>Iono}',Seqno='{FileModel>Seqno}')/$value",
                        mimeType: "{FileModel>MIMEType}",
                        enableEdit: false,
                        enableDelete: false,
                        visibleDelete: false,
                        visibleEdit: false,
                        attributes: [
                            new sap.m.ObjectAttribute({ text: "{path: 'FileModel>Createddt', type: 'sap.ui.model.type.Date', formatOptions: { pattern: 'yyyy/MM/dd' }}" }),
                            new sap.m.ObjectAttribute({ text: "{FileModel>Desc1}" }),
                            new sap.m.ObjectAttribute({ text: "{FileModel>Desc2}" }),
                            new sap.m.ObjectAttribute({ text: "{FileModel>Remarks}" })
                        ]
                    })
                });
            },

            setFilesEditMode: function () {
                //set edit mode to the upload collection
                var oJSONModel = new JSONModel();
                var data = {};
                data.editMode = true;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "FilesEditModeModel");

                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.setUploadButtonInvisible(false);
                oUploadCollection.setMode(sap.m.ListMode.SingleSelectLeft);

                this.disableOtherTabs();

            },

            cancelFilesEdit: function () {
                var oJSONModel = new JSONModel();
                var data = {};
                data.editMode = false;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "FilesEditModeModel");
                //make upload button visible
                var oUploadCollection = this.getView().byId('UploadCollection');
                //oUploadCollection.setUploadButtonInvisible(true);
                oUploadCollection.setMode(sap.m.ListMode.None);

                this.enableOtherTabs();
            },

            onAddFile: function () {
                //open the file select dialog
                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.openFileDialog();
            },

            onFileSelected: function () {
                //triggered when file selected
                that.uploadFile();
            },

            uploadFile: function () {
                //open the new file dialog
                if (!this._UploadFileDialog) {
                    this._UploadFileDialog = sap.ui.xmlfragment("zuiio2.view.fragments.UploadFile", this);
                    this.getView().addDependent(this._UploadFileDialog);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                this._UploadFileDialog.addStyleClass("sapUiSizeCompact");
                this._UploadFileDialog.open();


            },

            onStartUploadFile: function () {
                //on confirm of upload dialog, start upload of file
                this._UploadFileDialog.close();
                var oUploadCollection = this.getView().byId('UploadCollection');
                var cFiles = oUploadCollection.getItems().length;

                if (cFiles > 0) {
                    oUploadCollection.upload();
                }
                _seqNo = 0;
                this.enableOtherTabs();
            },

            onBeforeUploadStarts: async function (oEvent) {
                //setting the HTTP headers for additional information

                //SBU
                var oStylenoParam = new sap.m.UploadCollectionParameter({
                    name: "sbu",
                    value: that._sbu
                });
                oEvent.getParameters().addHeaderParameter(oStylenoParam);

                //io no
                var oStylenoParam = new sap.m.UploadCollectionParameter({
                    name: "iono",
                    value: that._ioNo
                });
                oEvent.getParameters().addHeaderParameter(oStylenoParam);

                //file description 1
                var fileDesc1 = sap.ui.getCore().byId("FileDesc1");
                var oFileDesc1Param = new sap.m.UploadCollectionParameter({
                    name: "desc1",
                    value: fileDesc1.getValue()
                });
                oEvent.getParameters().addHeaderParameter(oFileDesc1Param);
                //fileDesc1.setValue('');

                //file description 2
                var fileDesc2 = sap.ui.getCore().byId("FileDesc2");
                var oFileDesc2Param = new sap.m.UploadCollectionParameter({
                    name: "desc2",
                    value: fileDesc2.getValue()
                });
                oEvent.getParameters().addHeaderParameter(oFileDesc2Param);
                //fileDesc2.setValue('');

                //remarks
                var fileRemarks = sap.ui.getCore().byId("FileRemarks");
                var oFileRemarksParam = new sap.m.UploadCollectionParameter({
                    name: "remarks",
                    value: fileRemarks.getValue()
                });
                oEvent.getParameters().addHeaderParameter(oFileRemarksParam);
                //fileRemarks.setValue('');

                //seqno
                _seqNo++;
                var seqno = new sap.m.UploadCollectionParameter({
                    name: "seqno",
                    value: _seqNo
                });
                oEvent.getParameters().addHeaderParameter(seqno);


                //filename selected
                var oCustomerHeaderSlug = new sap.m.UploadCollectionParameter({
                    name: "slug",
                    value: oEvent.getParameter("fileName")
                });
                oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);

                // _promiseResult = new Promise((resolve, reject) => {
                //     resolve();
                //  });
                //  await _promiseResult;


                // setTimeout(function() {
                //     console.log("Event beforeUploadStarts triggered");
                // }, 400000);

                var oModel = that.getView().getModel("FileModel");
                oModel.refreshSecurityToken();

                //add the HTTP headers
                var oHeaders = oModel.oHeaders;
                var sToken = oHeaders['x-csrf-token'];

                var oCustomerHeaderToken = new sap.m.UploadCollectionParameter({
                    name: "x-csrf-token",
                    value: sToken
                });
                oEvent.getParameters().addHeaderParameter(oCustomerHeaderToken);
            },

            onUploadChange: function (oEvent) {
                var oUploadCollection = oEvent.getSource();
                //    add the HTTP headers

                var oModel = that.getView().getModel("FileModel");
                oModel.refreshSecurityToken();
                var oHeaders = oModel.oHeaders;
                var sToken = oHeaders['x-csrf-token'];

                // var oCustomerHeaderToken = new sap.m.UploadCollectionParameter({
                //     name: "x-csrf-token",
                //     value: sToken
                // });
                // oEvent.getParameters().addHeaderParameter(oCustomerHeaderToken);
                //  },

                // Header Token
                var oCustomerHeaderToken = new UploadCollectionParameter({
                    name: "x-csrf-token",
                    value: sToken
                });
                oUploadCollection.addHeaderParameter(oCustomerHeaderToken);
                //MessageToast.show("Event change triggered");
            },

            onUploadComplete: function (oEvent) {
                //on upload complete refresh the list
                that.getView().getModel("FileModel").refresh();
                var oUploadCollection = that.getView().byId('UploadCollection');
                oUploadCollection.removeAllItems();

                var fileDesc1 = sap.ui.getCore().byId("FileDesc1");
                var fileDesc2 = sap.ui.getCore().byId("FileDesc2");
                var fileRemarks = sap.ui.getCore().byId("FileRemarks");
                fileDesc1.setValue('');
                fileDesc2.setValue('');
                fileRemarks.setValue('');

                // var sUploadedFileName = oEvent.getParameter("files")[0].fileName;
                // setTimeout(function() {
                //     var oUploadCollection = that.getView().byId('UploadCollection');

                //     for (var i = 0; i < oUploadCollection.getItems().length; i++) {
                //         if (oUploadCollection.getItems()[i].getFileName() === sUploadedFileName) {
                //             oUploadCollection.removeItem(oUploadCollection.getItems()[i]);
                //             break;
                //         }
                //     }

                //     // delay the success message in order to see other messages before
                //     MessageBox.information("Event uploadComplete triggered");
                // }.bind(this), 8000);
            },

            onDeleteFile: function () {
                //confirm delete selected file dialog
                var oUploadCollection = this.getView().byId('UploadCollection');
                var selected = oUploadCollection.getSelectedItems();

                if (selected.length > 0) {
                    if (!this._ConfirmDeleteFileDialog) {
                        this._ConfirmDeleteFileDialog = sap.ui.xmlfragment("zuiio2.view.fragments.dialog.ConfirmDeleteFile", this);
                        this.getView().addDependent(this._ConfirmDeleteFileDialog);
                    }
                    jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                    this._ConfirmDeleteFileDialog.addStyleClass("sapUiSizeCompact");
                    this._ConfirmDeleteFileDialog.open();
                } else {
                    MessageBox.information(this._i18n.getText('No items selected'));
                }
            },

            onConfirmDeleteFile: function () {
                //delete selected file, call delete method of file odata service
                that._ConfirmDeleteFileDialog.close();
                var oUploadCollection = this.getView().byId('UploadCollection');
                var sPath = oUploadCollection.getSelectedItems()[0].getBindingContext('FileModel').sPath;
                var oModel = that.getView().getModel("FileModel");
                oModel.remove(sPath, {
                    success: function (oData, oResponse) {
                        that.getView().getModel("FileModel").refresh();
                    },
                    error: function (err) {
                    }
                });

                this.enableOtherTabs();
            },

            onCancelUploadFile: function () {
                //close edit mode, refresh the file list
                that._UploadFileDialog.close();
                var oUploadCollection = this.getView().byId('UploadCollection');
                that.getView().getModel("FileModel").refresh();
                oUploadCollection.removeAllItems();

                this.enableOtherTabs();
            },

            //******************************************* */
            // Common Functions
            //******************************************* */

            isInputFieldBlank(inputField) {
                return !inputField.getValue();
            },

            lock: async (me) => {
                var oModelLock = me.getOwnerComponent().getModel("ZGW_3DERP_LOCK_SRV");
                // var oModelLock = me._oModelLock;
                var oParamLock = {};
                var oIO_TAB = [];
                var sError = "";

                oIO_TAB.push({
                    "IONo": me.getView().getModel("ui2").getProperty("/currIONo"),
                    "Lock": "X"
                })

                oParamLock["IO_TAB"] = oIO_TAB;
                oParamLock["Iv_Count"] = 300;
                oParamLock["IO_MSG"] = [];

                console.log(oParamLock);

                var promise = new Promise((resolve, reject) => {
                    oModelLock.create("/ZERP_IOHDR", oParamLock, {
                        method: "POST",
                        success: function (oResultLock) {
                            console.log(oResultLock.IO_MSG.results);
                            oResultLock.IO_MSG.results.forEach(item => {
                                // console.log("Lock IO");
                                me.getOwnerComponent().getModel("LockModel").setData(oResultLock.IO_MSG);
                                // if (item.Type === "S") {
                                me.getView().getModel("ui").setProperty("/LockType", item.Type);
                                me.getView().getModel("ui").setProperty("/LockMessage", item.Message);
                                // alert(me.getView().getModel("ui").getProperty("/isLocked"));
                                // }
                                sError += item.Message + ".\r\n ";
                            })

                            if (sError.length > 0) {
                                resolve(false);
                                // sap.m.MessageBox.information(sError);
                                // me.closeLoadingDialog();
                            }
                            else resolve(true);
                        },
                        error: function (err) {
                            resolve(false);
                        }
                    });
                })
                return await promise;
            },

            unLock() {
                var oModelLock = this.getOwnerComponent().getModel("ZGW_3DERP_LOCK_SRV");
                var oParamUnLock = {};
                var oIO_TAB = [];
                var me = this;
                var sError = "";

                oIO_TAB.push({
                    "IONo": me.getView().getModel("ui2").getProperty("/currIONo"),
                    "Lock": ""
                })

                oParamUnLock["IO_TAB"] = oIO_TAB;
                oParamUnLock["Iv_Count"] = 300;
                oParamUnLock["IO_MSG"] = [];

                // console.log(oParamUnLock);

                oModelLock.create("/ZERP_IOHDR", oParamUnLock, {
                    method: "POST",
                    success: function (oResultLock) {
                        // console.log(oResultLock);
                        oResultLock.IO_MSG.results.forEach(item => {
                            if (item.Type === "S") {
                                me.getView().getModel("ui").setProperty("/LockType", "");
                                me.getView().getModel("ui").setProperty("/LockMessage", item.Message);
                                // alert(me.getView().getModel("ui").getProperty("/isLocked"));
                            }
                            sError += item.Message + ".\r\n ";
                        })

                        // console.log("Unlock", oResultLock)
                    },
                    error: function (err) {
                        // me.closeLoadingDialog();
                    }
                })
                this._oLock = [];
            },

            onCloseDialog: function (oEvent) {
                oEvent.getSource().getParent().close();
                this._DiscardHeaderChangesDialog.destroy();
                this._DiscardHeaderChangesDialog = null;

                var feCName = "";
                this._aColumns["IOHDRTab"].forEach(ci => {
                    // console.log(ci.ColumnName);
                    if (ci.Mandatory === true && ci.Editable === true) {
                        feCName = "fe" + ci.ColumnName;
                        this.getView().byId(feCName)._oLabel.RemoveStyleClass("sapMLabelRequired");
                    }
                })
            },

            onCancelImportPO: function () {
                this._ImportPODialog.close();
                this._ImportPODialog.destroy();
                this._ImportPODialog = null;

                this.unLock();
            },

            disableOtherTabs: function () {
                var oIconTabBar = this.byId("idIconTabBarInlineMode");
                oIconTabBar.getItems().filter(item => item.getProperty("key") !== oIconTabBar.getSelectedKey())
                    .forEach(item => item.setProperty("enabled", false));
            },

            enableOtherTabs: function () {
                var oIconTabBar = this.byId("idIconTabBarInlineMode");
                oIconTabBar.getItems().forEach(item => item.setProperty("enabled", true));
            },

            formatValueHelp: function (sValue, sPath, sKey, sText, sFormat) {
                // console.log(sValue, sPath, sKey, sText, sFormat);
                var oValue = this.getView().getModel(sPath).getData().filter(v => v[sKey] === sValue);

                if (oValue && oValue.length > 0) {
                    if (sFormat === "Value") {
                        return oValue[0][sText];
                    }
                    else if (sFormat === "ValueKey") {
                        return oValue[0][sText] + " (" + sValue + ")";
                    }
                    else if (sFormat === "KeyValue") {
                        return sValue + " (" + oValue[0][sText] + ")";
                    }
                }
                else return sValue;
            },

            onIOSaveTableLayout: function (tablename) {
                //saving of the layout of table
                var me = this;
                var ctr = 1;

                if (tablename === "IODLVTab") {
                    var oTable = this.getView().byId(tablename);
                    var oColumns = oTable.getColumns();
                    var vSBU = this._sbu;

                    var oParam = {
                        "SBU": vSBU,
                        "TYPE": "IODLV",
                        "TABNAME": "ZDV_3DERP_IODLV",
                        "TableLayoutToItems": []
                    };
                }

                if (tablename === "ioMatListTab") {
                    var oTable = this.getView().byId(tablename);
                    var oColumns = oTable.getColumns();
                    var vSBU = this._sbu;

                    var oParam = {
                        "SBU": vSBU,
                        "TYPE": "IOMATLIST",
                        "TABNAME": "ZDV_3DERP_MATLST",
                        "TableLayoutToItems": []
                    };
                }

                //get information of columns, add to payload
                oColumns.forEach((column) => {
                    if (column.sId !== "Manage" && column.sId !== "Copy") {
                        oParam.TableLayoutToItems.push({
                            // COLUMNNAME: column.sId,
                            COLUMNNAME: column.mProperties.sortProperty,
                            ORDER: ctr.toString(),
                            SORTED: column.mProperties.sorted,
                            SORTORDER: column.mProperties.sortOrder,
                            SORTSEQ: "1",
                            VISIBLE: column.mProperties.visible,
                            WIDTH: column.mProperties.width.replace('px', '')
                        });

                        ctr++;
                    }
                });
                //call the layout save
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oModel.create("/TableLayoutSet", oParam, {
                    method: "POST",
                    success: function (data, oResponse) {
                        sap.m.MessageBox.information("Layout saved.");
                    },
                    error: function (err) {
                        // console.log(err);
                        sap.m.MessageBox.error(err);
                    }
                });
            },

            setColumnFilters(sTable) {
                if (this._aColFilters) {
                    var oTable = this.byId(sTable);
                    var oColumns = oTable.getColumns();

                    this._aColFilters.forEach(item => {
                        oColumns.filter(fItem => fItem.getFilterProperty() === item.sPath)
                            .forEach(col => {
                                col.filter(item.oValue1);
                            })
                    })
                }
            },

            setColumnSorters(sTable) {
                if (this._aColSorters) {
                    var oTable = this.byId(sTable);
                    var oColumns = oTable.getColumns();

                    this._aColSorters.forEach(item => {
                        oColumns.filter(fItem => fItem.getSortProperty() === item.sPath)
                            .forEach(col => {
                                col.sort(item.bDescending);
                            })
                    })
                }
            },

            getColumnFilterSorter(arg) {
                this._aColFilters = [], this._aColSorters = [];
                // console.log(this.byId(arg + "Tab").getBinding("rows"))
                if (this.byId(arg + "Tab").getBinding("rows").aFilters.length > 0) {
                    this._aColFilters = this.byId(arg + "Tab").getBinding("rows").aFilters;
                }

                if (this.byId(arg + "Tab").getBinding("rows").aSorters.length > 0) {
                    this._aColSorters = this.byId(arg + "Tab").getBinding("rows").aSorters;
                }
            },

            pad: function (num, size) {
                try {
                    num = num.toString();
                    while (num.length < size) num = "0" + num;
                    return num;
                } catch (err) { }
            },

        });
    });