document.addEventListener('DOMContentLoaded', function () {
  var cocoonElementCounter = 0;

  var createNewID = function () {
    return (new Date().getTime() + cocoonElementCounter++);
  };

  var newcontentBraced = function (id) {
    return '[' + id + ']$1';
  };

  var newcontentUnderscored = function (id) {
    return '_' + id + '_$1';
  };

  var getInsertionNodeElem = function (insertionNode, insertionTraversal, thisNode) {
    if (!insertionNode) {
      return thisNode.parentNode;
    }

    if (typeof insertionNode === 'function') {
      if (insertionTraversal) {
        console.warn('association-insertion-traversal is ignored, because association-insertion-node is given as a function.');
      }
      return insertionNode(thisNode);
    }

    if (typeof insertionNode === 'string') {
      if (insertionTraversal) {
        return thisNode[insertionTraversal](insertionNode);
      } else {
        return insertionNode === 'this' ? thisNode : document.querySelector(insertionNode);
      }
    }
  };

  function cocoonDetach (node) {
    return node.parentElement.removeChild(node);
  }

  function cocoonGetPreviousSibling (elem, selector) {
    console.log('cocoonGetPreviousSibling[' + elem + '][' + selector + ']');
    console.log('>' + elem.innerHTML + '<');
    var sibling = elem.previousElementSibling;
    console.log('first->' + sibling);

    if (!selector) return sibling;

    while (sibling) {
      var match = sibling.matches(selector);
      console.log('Try [' + match + '] against [' + selector + '] -> ' + match);
      if (match) return sibling;
      sibling = sibling.previousElementSibling;
    }
  };

  function cocoonAddFields (e, target) {
    e.preventDefault();
    e.stopPropagation();

    var thisNode = target;
    var assoc = thisNode.getAttribute('data-association');
    var assocs = thisNode.getAttribute('data-associations');
    var content = thisNode.getAttribute('data-association-insertion-template');
    var insertionMethod = thisNode.getAttribute('data-association-insertion-method') || thisNode.getAttribute('data-association-insertion-position') || 'before';
    var insertionNode = thisNode.getAttribute('data-association-insertion-node');
    var insertionTraversal = thisNode.getAttribute('data-association-insertion-traversal');
    var count = parseInt(thisNode.getAttribute('data-count'), 10);
    var regexpBraced = new RegExp('\\[new_' + assoc + '\\](.*?\\s)', 'g');
    var regexpUnderscored = new RegExp('_new_' + assoc + '_(\\w*)', 'g');
    var newId = createNewID();
    var newContent = content.replace(regexpBraced, newcontentBraced(newId));
    var newContents = [];
    var originalEvent = e;

    if (newContent === content) {
      regexpBraced = new RegExp('\\[new_' + assocs + '\\](.*?\\s)', 'g');
      regexpUnderscored = new RegExp('_new_' + assocs + '_(\\w*)', 'g');
      newContent = content.replace(regexpBraced, newcontentBraced(newId));
    }

    newContent = newContent.replace(regexpUnderscored, newcontentUnderscored(newId));
    newContents = [newContent];

    count = (isNaN(count) ? 1 : Math.max(count, 1));
    count -= 1;

    while (count) {
      newId = createNewID();
      newContent = content.replace(regexpBraced, newcontentBraced(newId));
      newContent = newContent.replace(regexpUnderscored, newcontentUnderscored(newId));
      newContents.push(newContent);

      count -= 1;
    }

    var insertionNodeElem = getInsertionNodeElem(insertionNode, insertionTraversal, thisNode);

    if (!insertionNodeElem || (insertionNodeElem.length === 0)) {
      console.warn("Couldn't find the element to insert the template. Make sure your `data-association-insertion-*` on `link_to_add_association` is correct.");
    }

    newContents.forEach(function (node, i) {
      var contentNode = node;

      var beforeInsert = new CustomEvent('cocoon:before-insert', { detail: [contentNode, originalEvent] });
      insertionNodeElem.dispatchEvent(beforeInsert);

      if (!beforeInsert.defaultPrevented) {
        // allow any of the jquery dom manipulation methods (after, before, append, prepend, etc)
        // to be called on the node.  allows the insertion node to be the parent of the inserted
        // code and doesn't force it to be a sibling like after/before does. default: 'before'
        // TODO: add more htmpMappings
        var htmlMapping = {
          append: 'beforeend'
        };
        var htmlMethod = htmlMapping[insertionMethod];
        var addedContent = insertionNodeElem.insertAdjacentHTML(htmlMethod, contentNode);

        var afterInsert = new CustomEvent('cocoon:after-insert', { detail: [contentNode, originalEvent, addedContent] });
        insertionNodeElem.dispatchEvent(afterInsert);
      }
    });
  };

  function cocoonRemoveFields (e, target) {
    var thisNode = target;
    var wrapperClass = thisNode.getAttribute('data-wrapper-class') || 'nested-fields';
    var nodeToDelete = thisNode.closest('.' + wrapperClass);
    var triggerNode = nodeToDelete.parentNode;
    var originalEvent = e;

    e.preventDefault();
    e.stopPropagation();

    var beforeRemove = new CustomEvent('cocoon:before-remove', { detail: [nodeToDelete, originalEvent] });
    triggerNode.dispatchEvent(beforeRemove);

    if (!beforeRemove.defaultPrevented) {
      var timeout = triggerNode.getAttribute('data-remove-timeout') || 0;

      setTimeout(function () {
        if (thisNode.classList.contains('dynamic')) {
          cocoonDetach(nodeToDelete);
        } else {
          var hiddenInput = cocoonGetPreviousSibling(thisNode, 'input[type=hidden]');
          hiddenInput.value = '1';
          nodeToDelete.style.display = 'none';
        }
        var afterRemove = new CustomEvent('cocoon:after-remove', { detail: [nodeToDelete, originalEvent] });
        triggerNode.dispatchEvent(afterRemove);
      }, timeout);
    }
  }

  document.addEventListener('click', function (e) {
    for (var target = e.target; target && target !== this; target = target.parentNode) {
      if (target.matches('.add_fields')) {
        cocoonAddFields(e, target);
        return;
      }
      if (target.matches('.remove_fields')) {
        cocoonRemoveFields(e, target);
        return;
      }
    }
  }, false);

  /* $(document).on('ready page:load turbolinks:load', function () {
    $('.remove_fields.existing.destroyed').each(function (i, obj) {
      var thisNode = $(this);
      var wrapperClass = thisNode.data('wrapper-class') || 'nested-fields';

      thisNode.closest('.' + wrapperClass).hide();
    });
  }); */
});
