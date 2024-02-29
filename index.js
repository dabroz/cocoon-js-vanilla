document.addEventListener('DOMContentLoaded', () => {
  let cocoonElementCounter = 0;

  const createNewID = function () {
    return (new Date().getTime() + cocoonElementCounter++);
  };

  const newcontentBraced = function (id) {
    return `[${id}]$1`;
  };

  const newcontentUnderscored = function (id) {
    return `_${id}_$1`;
  };

  const getInsertionNodeElem = function (insertionNode, insertionTraversal, thisNode) {
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
      }
      return insertionNode === 'this' ? thisNode : document.querySelector(insertionNode);
    }
  };

  const cocoonDetach = function (node) {
    return node.parentElement.removeChild(node);
  };

  const cocoonGetPreviousSibling = function (elem, selector) {
    let sibling = elem.previousElementSibling;

    if (!selector) return sibling;

    while (sibling) {
      const match = sibling.matches(selector);
      if (match) return sibling;
      sibling = sibling.previousElementSibling;
    }
  };

  const cocoonAddFields = function (e, target) {
    e.preventDefault();
    e.stopPropagation();

    const thisNode = target;
    const assoc = thisNode.getAttribute('data-association');
    const assocs = thisNode.getAttribute('data-associations');
    const content = thisNode.getAttribute('data-association-insertion-template');
    const insertionMethod = thisNode.getAttribute('data-association-insertion-method') || thisNode.getAttribute('data-association-insertion-position') || 'before';
    const insertionNode = thisNode.getAttribute('data-association-insertion-node');
    const insertionTraversal = thisNode.getAttribute('data-association-insertion-traversal');
    let count = parseInt(thisNode.getAttribute('data-count'), 10);
    let regexpBraced = new RegExp(`\\[new_${assoc}\\](.*?\\s)`, 'g');
    let regexpUnderscored = new RegExp(`_new_${assoc}_(\\w*)`, 'g');
    let newId = createNewID();
    let newContent = content.replace(regexpBraced, newcontentBraced(newId));
    let newContents = [];
    const originalEvent = e;

    if (newContent === content) {
      regexpBraced = new RegExp(`\\[new_${assocs}\\](.*?\\s)`, 'g');
      regexpUnderscored = new RegExp(`_new_${assocs}_(\\w*)`, 'g');
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

    const insertionNodeElem = getInsertionNodeElem(insertionNode, insertionTraversal, thisNode);

    if (!insertionNodeElem || (insertionNodeElem.length === 0)) {
      console.warn("Couldn't find the element to insert the template. Make sure your `data-association-insertion-*` on `link_to_add_association` is correct.");
    }

    newContents.forEach((node, i) => {
      const contentNode = node;

      const beforeInsert = new CustomEvent('cocoon:before-insert', { bubbles: true, cancelable: true, detail: [contentNode, originalEvent] });
      insertionNodeElem.dispatchEvent(beforeInsert);

      if (!beforeInsert.defaultPrevented) {
        // allow any of the jquery dom manipulation methods (after, before, append, prepend, etc)
        // to be called on the node.  allows the insertion node to be the parent of the inserted
        // code and doesn't force it to be a sibling like after/before does. default: 'before'
        const htmlMapping = {
          before: 'beforebegin',
          prepend: 'afterbegin',
          append: 'beforeend',
          after: 'afterend',
        };

        const htmlMethod = htmlMapping[insertionMethod];
        let addedContent = insertionNodeElem.insertAdjacentHTML(htmlMethod, contentNode);

        if (htmlMethod === htmlMapping.before) {
          addedContent = insertionNodeElem.previousElementSibling;
        } else if (htmlMethod === htmlMapping.prepend) {
          addedContent = insertionNodeElem.firstElementChild;
        } else if (htmlMethod === htmlMapping.append) {
          addedContent = insertionNodeElem.lastElementChild;
        } else if (htmlMethod === htmlMapping.after) {
          addedContent = insertionNodeElem.nextElementSibling;
        }

        const afterInsert = new CustomEvent('cocoon:after-insert', { bubbles: true, detail: [contentNode, originalEvent, addedContent] });
        insertionNodeElem.dispatchEvent(afterInsert);
      }
    });
  };

  const cocoonRemoveFields = function (e, target) {
    const thisNode = target;
    const wrapperClass = thisNode.getAttribute('data-wrapper-class') || 'nested-fields';
    const nodeToDelete = thisNode.closest(`.${wrapperClass}`);
    const triggerNode = nodeToDelete.parentNode;
    const originalEvent = e;

    e.preventDefault();
    e.stopPropagation();

    const beforeRemove = new CustomEvent('cocoon:before-remove', { bubbles: true, cancelable: true, detail: [nodeToDelete, originalEvent] });
    triggerNode.dispatchEvent(beforeRemove);

    if (!beforeRemove.defaultPrevented) {
      const timeout = triggerNode.getAttribute('data-remove-timeout') || 0;

      setTimeout(() => {
        if (thisNode.classList.contains('dynamic')) {
          cocoonDetach(nodeToDelete);
        } else {
          const hiddenInput = cocoonGetPreviousSibling(thisNode, 'input[type=hidden]');
          hiddenInput.value = '1';
          nodeToDelete.style.display = 'none';

          const inputs = nodeToDelete.querySelectorAll('input[required]');
          for (let i = 0; i < inputs.length; i++) {
            inputs[i].removeAttribute('required');
          }
        }
        const afterRemove = new CustomEvent('cocoon:after-remove', { bubbles: true, detail: [nodeToDelete, originalEvent] });
        triggerNode.dispatchEvent(afterRemove);
      }, timeout);
    }
  };

  document.addEventListener('click', function (e) {
    for (let { target } = e; target && target !== this; target = target.parentNode) {
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

  const hideRemovedFields = function () {
    const targets = document.querySelectorAll('.remove_fields.existing.destroyed');
    for (let i = 0; i < targets.length; i++) {
      const thisNode = targets[i];
      const wrapperClass = thisNode.getAttribute('data-wrapper-class') || 'nested-fields';
      const nodeToHide = thisNode.closest(`.${wrapperClass}`);

      nodeToHide.style.display = 'none';
    }
  };

  document.addEventListener('page:load', hideRemovedFields);
  document.addEventListener('turbolinks:load', hideRemovedFields); // Has been replaced by Turbo
  document.addEventListener('turbo:load', hideRemovedFields);

  hideRemovedFields();
});
