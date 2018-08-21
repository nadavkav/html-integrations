import IntegrationModel from './core/src/integrationmodel.js';
import Parser from './core/src/parser.js';
import Util from './core/src/util.js';

/**
 * IntegrationModel constructor. This method sets the dependant
 * integration properties needed by the IntegrationModel class to init the plugin.
 */
export default class CKEditorIntegration extends IntegrationModel {
  constructor(integrationModelProperties) {
    super(integrationModelProperties);

    /**
     * Folder name used for the integration inside ckeditor plugins folder.
     * @type {string}
     */
    this.integrationFolderName = 'ckeditor_wiris';
  }

  /**
   * It creates MathType and ChemType commands.
   * @param {object} editor CKEditor editor instance.
   */
  createButtonCommands(editor) {
    // Is needed specify that our images are allowed.
    let allowedContent = 'img[align,';
    allowedContent += WirisPlugin.Configuration.get('imageMathmlAttribute');
    allowedContent += ',src,alt](!Wirisformula)';

    // MathType Editor
    editor.addCommand('ckeditor_wiris_openFormulaEditor', {

      'async': false,
      'canUndo': true,
      'editorFocus': true,
      'allowedContent': allowedContent,
      'requiredContent': allowedContent,

      'exec': function (editor) {
        this.core.getCustomEditors().disable();
        this.openNewFormulaEditor();
      }.bind(this)

    });

    // ChemType
    editor.addCommand('ckeditor_wiris_openFormulaEditorChemistry', {

      'async': false,
      'canUndo': true,
      'editorFocus': true,
      'allowedContent': allowedContent,
      'requiredContent': allowedContent,

      'exec': function (editor) {
        this.core.getCustomEditors().enable('chemistry');
        this.openNewFormulaEditor();
      }.bind(this)

    });

  }

  addImageListeners(editor) {
    editor.on('doubleclick', function (event) {

      if (event.data.element.$.nodeName.toLowerCase() == 'img' &&
        Util.containsClass(event.data.element.$, _wrs_conf_imageClassName) ||
        Util.containsClass(event.data.element.$, _wrs_conf_CASClassName)) {

        event.data.dialog = null;
      }

    });
  }

  addEditorListeners(editor) {
    if (typeof editor.config.wirislistenersdisabled == 'undefined' ||
      !editor.config.wirislistenersdisabled) {

      // First editor parsing.
      editor.setData(Parser.initParse(editor.getData()));

      editor.on('contentDom', function () {

        editor.on('doubleclick', function (event) {

          if (event.data.element.$.nodeName.toLowerCase() == 'img' &&
            Util.containsClass(event.data.element.$, WirisPlugin.Configuration.get('imageClassName')) ||
            Util.containsClass(event.data.element.$, WirisPlugin.Configuration.get('CASClassName'))) {

            event.data.dialog = null;
          }

        }.bind(this));

      }.bind(this));


      editor.on('setData', function (e) {

        e.data.dataValue = Parser.initParse(e.data.dataValue || "");

      }.bind(this));

      editor.on('afterSetData', function (e) {

        if (typeof Parser.observer !== 'undefined') {
          Array.prototype.forEach.call(document.getElementsByClassName('Wirisformula'), function (wirisImages) {

            Parser.observer.observe(wirisImages);

          });
        }

      }.bind(this));

      editor.on('getData', function (e) {

        e.data.dataValue = Parser.endParse(e.data.dataValue || "");

      }.bind(this));

      // When CKEditors changes from WYSIWYG to source element, recalculate 'element' variable is mandatory.
      editor.on('mode', function (e) {

        this.checkElement();

      }.bind(this));

      this.checkElement();
    }
    else {
      // CKEditor replaces several times the element element during its execution, so we must assign the events again.
      // We need to set a callback function to set 'element' variable inside CKEDITOR.plugins.add scope.
      editor.on('instanceReady', function (params) {

        this.checkElement();

      }.bind(this));

      editor.resetDirty();
    }
  }

  /**
   * CKEditor replaces several times the element element during its execution,
   * so we must assign the events again to editor element.
   */
  checkElement() {
    const editor = this.callbackMethodArguments.editor;
    const elem = document.getElementById('cke_contents_' + editor.name) ?
      document.getElementById('cke_contents_' + editor.name) :
      document.getElementById('cke_' + editor.name);

    let newElement;
    if (editor.elementMode == CKEDITOR.ELEMENT_MODE_INLINE) {
      newElement = editor.container.$;
    } else {
      newElement = elem.getElementsByTagName('iframe')[0];
    }

    let _wrs_int_divIframe = false;
    if (!newElement) {
      // On this case, ckeditor uses a div area instead of and iframe as the editable area. Events must be integrated on the div area.
      let dataContainer;
      for (let classElementIndex in elem.classList) {
        const classElement = elem.classList[classElementIndex];
        if (classElement.search('cke_\\d') != -1) {
          dataContainer = classElement;
          break;
        }
      }
      if (dataContainer) {
        newElement = document.getElementById(dataContainer + '_contents');
        _wrs_int_divIframe = true;
      }
    }

    // If the element wasn't treated, add the events.
    if (!newElement.wirisActive) {
      if (editor.elementMode == CKEDITOR.ELEMENT_MODE_INLINE) {
        if (newElement.tagName == 'TEXTAREA') {
          // Inline editor from a textarea element. In this case the textarea will be replaced by a div element with inline editing enabled.
          const eventElements = document.getElementsByClassName('cke_textarea_inline');
          Array.prototype.forEach.call(eventElements, function (entry) {

            Util.addElementEvents(
              entry,
              function (element, event) {

                this.doubleClickHandlerForDiv(
                  editor,
                  element,
                  event
                );

              }.bind(this),
              this.mousedownHandler,
              this.mouseupHandler
            );

          });
        }
        else {
          Util.addElementEvents(newElement, function (element, event) {

            this.doubleClickHandlerForDiv(element, event);

          }.bind(this), this.mousedownHandler.bind(this), this.mouseupHandler.bind(this));
        }
        // Set the element as treated
        newElement.wirisActive = true;
      }
      else if (newElement.contentWindow != null) {
        Util.addIframeEvents(newElement, function (element, event) {

          this.doubleClickHandlerForIframe(element, event);

        }.bind(this), this.mousedownHandler.bind(this), this.mouseupHandler.bind(this));
        // Set the element as treated
        newElement.wirisActive = true;
      }
      else if (_wrs_int_divIframe) {
        Util.addElementEvents(newElement, function (element, event) {

          this.doubleClickHandlerForDiv(element, event);

        }.bind(this), this.mousedownHandler.bind(this), this.mouseupHandler.bind(this));
        // Set the element as treated
        newElement.wirisActive = true;
      }
    }
  }

  /**
   * Handles a double click on the contentEditable div.
   * @param object div Target
   * @param object element Element double clicked
   */
  doubleClickHandlerForDiv(element, event) {
    this.doubleClickHandler(element, event);
  }

  /**
   * Handles a double click on the iframe.
   * @param object div Target
   * @param object element Element double clicked
   */
  doubleClickHandlerForIframe(element, event) {
    this.doubleClickHandler(element, event);
  }

  /**
   * Handles a double click.
   * @param object target Target
   * @param object element Element double clicked
   */
  doubleClickHandler(element, event) {
    if (element.nodeName.toLowerCase() == 'img') {
      if (Util.containsClass(element, WirisPlugin.Configuration.get('imageClassName'))) {
        // Some plugins (image2, image) open a dialog on double click. On formulas
        // doubleclick event ends here.
        if (typeof event.stopPropagation != 'undefined') { // old I.E compatibility.
          event.stopPropagation();
        } else {
          event.returnValue = false;
        }
        this.core.getCustomEditors().disable();
        const customEditorAttr = element.getAttribute('data-custom-editor');
        if (customEditorAttr) {
          this.core.getCustomEditors().enable(customEditorAttr);
        }
        this.core.editionProperties.temporalImage = element;
        this.openExistingFormulaEditor();
      }
    }
  }

  /**
   * Wrapper from Core.js to get integration folder path.
   */
  getCorePath() {
    return CKEDITOR.plugins.getPath(this.integrationFolderName);
  }

  /**
   * Gets the target selection.
   */
  getSelection() {
    this.callbackMethodArguments.editor.editable().$.focus();
    return this.callbackMethodArguments.editor.getSelection().getNative();
  }

  /**
   * This function is called from wrs_int_selectRange on core.js
   * Uses CKEDITOR focus method to move caret to a specific range.
   */
  selectRange(range) {
    // Select end position to set the caret after the image.
    range.setStart(range.endContainer, range.endOffset);
    // We set selection at start of range because we set start at end of selection.
    range.collapse(true);
    // Due to ckeditor has its own DOM Elements and also we use the document selection
    // is needed update ckeditor instance's selection and document's selection.
    this.callbackMethodArguments.editor.getSelection().selectRanges(range);
    const currentSelection = document.getSelection();
    currentSelection.removeAllRanges();
    currentSelection.addRange(range);
  }

  callbackFunction() {
    super.callbackFunction();
    this.createButtonCommands(this.callbackMethodArguments.editor);
    this.addEditorListeners(this.callbackMethodArguments.editor);
  }
}

(function () {

  CKEDITOR.plugins.add('ckeditor_wiris', {
    'init': function (editor) {

    editor.ui.addButton('ckeditor_wiris_formulaEditor', {

      'label': 'Insert a math equation - MathType',
      'command': 'ckeditor_wiris_openFormulaEditor',
      'icon': CKEDITOR.plugins.getPath('ckeditor_wiris') + './icons/' + 'formula.png'

    });

    editor.ui.addButton('ckeditor_wiris_formulaEditorChemistry', {

      'label': 'Insert a chemistry formula - ChemType',
      'command': 'ckeditor_wiris_openFormulaEditorChemistry',
      'icon': CKEDITOR.plugins.getPath('ckeditor_wiris') + './icons/' + 'chem.png'

    });

    editor.on('instanceReady', function () {
      let callbackMethodArguments = {};
      callbackMethodArguments.editor = editor;

      /**
       * Integration model properties
       * @type {object}
       * @property {object} target - Integration DOM target.
       * @property {string} configurationService - Configuration integration service.
       * @property {string} version - Plugin version.
       * @property {string} scriptName - Integration script name.
       * @property {object} environment - Integration environment properties.
       * @property {string} editor - Editor name.
       */
      let integrationModelProperties = {};
      integrationModelProperties.target = editor.container.$;
      integrationModelProperties.configurationService = '@param.js.configuration.path@';
      integrationModelProperties.version = '@plugin.version@';
      integrationModelProperties.scriptName = "plugin.js";
      integrationModelProperties.langFolderName = 'languages';
      integrationModelProperties.environment = {};
      integrationModelProperties.environment.editor = "CKEditor4";
      integrationModelProperties.callbackMethodArguments = callbackMethodArguments;


      let ckeditorIntegrationInstance = new CKEditorIntegration(integrationModelProperties);

      ckeditorIntegrationInstance.init();

    });
    }
  });

})();