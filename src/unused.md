## Registry State

Building the tree.

```
getTree()
{
    if (this._tree) {
        return this._tree;
    }

    this._tree = this._buildTreeNode(ROOT_NAME);
    if (!this._tree) {
        this._tree = {
            kind: ROOT_NAME,
            rn: ROOT_NAME
        }
    }

    return this._tree;
}
```


```
private _buildTreeNode(parentDn: string)
{
    var node = this._nodeMap[parentDn];
    if (!node) {
        return null;
    }

    var node = _.clone(node);
    node.children = [];

    var childrenDns = this.getChildrenDns(parentDn);
    for(var childDn of childrenDns)
    {
        var childTreeNode = this._buildTreeNode(childDn);
        if (childTreeNode)
        {
            node.children.push(childTreeNode);
        }
    }

    return node;
}
```


```
// childrenByKind(parentDn: string, kind: string) : Record<string, any>
// {
//     var newResult : Record<string, any> = {};
//     var childDns = this._childrenMap[parentDn];
//     if (childDns) {
//         for(var childDn of childDns) {
//             var childNode = this._constructNode(childDn);
//             if (childNode) {
//                 if (childNode.kind == kind)
//                 {
//                     newResult[childDn] = childNode;
//                 }
//             }
//         }
//     }
//     return newResult;
// }
```