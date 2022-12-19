package workflows

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
	"github.com/pkg/errors"

	"github.com/lncapital/torq/internal/database"
	"github.com/lncapital/torq/pkg/commons"
)

func GetWorkflow(db *sqlx.DB, workflowId int) (Workflow, error) {
	var wf Workflow
	err := db.Get(&wf, `SELECT * FROM workflow WHERE workflow_id=$1;`, workflowId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Workflow{}, nil
		}
		return Workflow{}, errors.Wrap(err, database.SqlExecutionError)
	}
	return wf, nil
}

func GetWorkflowByWorkflowVersionId(db *sqlx.DB, workflowVersionId int) (Workflow, error) {
	var wf Workflow
	err := db.Get(&wf, `
		SELECT wf.*
		FROM workflow_version wfv
		JOIN workflow wf ON wf.workflow_id=wfv.workflow_id
		WHERE wfv.workflow_version_id=$1;`, workflowVersionId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Workflow{}, nil
		}
		return Workflow{}, errors.Wrap(err, database.SqlExecutionError)
	}
	return wf, nil
}

func GetWorkflows(db *sqlx.DB) ([]Workflow, error) {
	var wfs []Workflow
	err := db.Select(&wfs, `SELECT * FROM workflow;`)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []Workflow{}, nil
		}
		return []Workflow{}, errors.Wrap(err, database.SqlExecutionError)
	}
	return wfs, nil
}

func addWorkflow(db *sqlx.DB, workflow Workflow) (Workflow, error) {
	workflow.CreatedOn = time.Now().UTC()
	workflow.UpdateOn = workflow.CreatedOn
	err := db.QueryRowx(`INSERT INTO workflow (name, type, status, created_on, updated_on)
		VALUES ($1, $2, $3, $4, $5) RETURNING workflow_id;`,
		workflow.Name, workflow.Type, workflow.Status, workflow.CreatedOn, workflow.UpdateOn).Scan(&workflow.WorkflowId)
	if err != nil {
		if err, ok := err.(*pq.Error); ok {
			if err.Code == "23505" {
				return Workflow{}, errors.Wrap(err, database.SqlUniqueConstraintError)
			}
		}
		return Workflow{}, errors.Wrap(err, database.SqlExecutionError)
	}
	return workflow, nil
}

func setWorkflow(db *sqlx.DB, workflow Workflow) (Workflow, error) {
	workflow.UpdateOn = time.Now().UTC()
	_, err := db.Exec(`UPDATE workflow SET name=$1, type=$2, status=$3, updated_on=$5 WHERE workflow_id=$6;`,
		workflow.Name, workflow.Type, workflow.Status, workflow.UpdateOn, workflow.WorkflowId)
	if err != nil {
		if err, ok := err.(*pq.Error); ok {
			if err.Code == "23505" {
				return Workflow{}, errors.Wrap(err, database.SqlUniqueConstraintError)
			}
		}
		return Workflow{}, errors.Wrap(err, database.SqlExecutionError)
	}
	return workflow, nil
}

func removeWorkflow(db *sqlx.DB, workflowId int) (int64, error) {
	res, err := db.Exec(`DELETE FROM workflow WHERE workflow_id = $1;`, workflowId)
	if err != nil {
		return 0, errors.Wrap(err, database.SqlExecutionError)
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return 0, errors.Wrap(err, database.SqlAffectedRowsCheckError)
	}
	return rowsAffected, nil
}

func GetWorkflowVersion(db *sqlx.DB, workflowVersionId int) (WorkflowVersion, error) {
	var wfv WorkflowVersion
	err := db.Get(&wfv, `SELECT * FROM workflow_version WHERE workflow_version_id=$1;`, workflowVersionId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return WorkflowVersion{}, nil
		}
		return WorkflowVersion{}, errors.Wrap(err, database.SqlExecutionError)
	}
	return wfv, nil
}

func GetWorkflowVersions(db *sqlx.DB, workflowId int) ([]WorkflowVersion, error) {
	var wfvs []WorkflowVersion
	err := db.Select(&wfvs, `SELECT * FROM workflow_version WHERE workflow_id=$1;`, workflowId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []WorkflowVersion{}, nil
		}
		return []WorkflowVersion{}, errors.Wrap(err, database.SqlExecutionError)
	}
	return wfvs, nil
}

func addWorkflowVersion(db *sqlx.DB, workflowId int, name string) (WorkflowVersion, error) {
	return cloneWorkflowVersion(db, workflowId, 0, name)
}

func cloneWorkflowVersion(db *sqlx.DB, workflowId int, version int, name string) (WorkflowVersion, error) {
	var wfv WorkflowVersion
	var err error
	if version == 0 {
		//close latest or when nothing exists create new empty version
		err = db.Get(&wfv, `SELECT * FROM workflow_version WHERE workflow_id=$1 ORDER BY version DESC LIMIT 1;`, workflowId)
	} else {
		err = db.Get(&wfv, `SELECT * FROM workflow_version WHERE workflow_id=$1 AND version=$2;`, workflowId, version)
	}
	if err != nil {
		return WorkflowVersion{}, errors.Wrap(err, database.SqlExecutionError)
	}
	if wfv.WorkflowVersionId == 0 {
		wfv = WorkflowVersion{}
		wfv.CreatedOn = time.Now().UTC()
		if name == "" {
			wfv.Name = fmt.Sprintf("%v", wfv.CreatedOn.Format("20060102.150405.000000"))
		} else {
			wfv.Name = name
		}
		wfv.UpdateOn = wfv.CreatedOn
		wfv.WorkflowId = workflowId
		wfv.Version = version
		err := db.QueryRowx(`INSERT INTO workflow_version (name, version, status, workflow_id, created_on, updated_on)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING workflow_version_id;`,
			wfv.Name, wfv.Version, wfv.Status, wfv.WorkflowId, wfv.CreatedOn, wfv.UpdateOn).Scan(&wfv.WorkflowVersionId)
		if err != nil {
			return WorkflowVersion{}, errors.Wrap(err, database.SqlExecutionError)
		}
	} else {
		// TODO ACTUALLY CLONE
		return WorkflowVersion{}, errors.New("NOT IMPLEMENTED YET")
	}
	return wfv, nil
}

func setWorkflowVersion(db *sqlx.DB, workflowVersion WorkflowVersion) (WorkflowVersion, error) {
	workflowVersion.UpdateOn = time.Now().UTC()
	_, err := db.Exec(`UPDATE workflow_version SET name=$1, version=$2, status=$3, updated_on=$4 WHERE workflow_version_id=$5;`,
		workflowVersion.Name, workflowVersion.Version, workflowVersion.Status, workflowVersion.UpdateOn, workflowVersion.WorkflowVersionId)
	if err != nil {
		return WorkflowVersion{}, errors.Wrap(err, database.SqlExecutionError)
	}
	return workflowVersion, nil
}

func removeWorkflowVersion(db *sqlx.DB, workflowVersionId int) (int64, error) {
	res, err := db.Exec(`DELETE FROM workflow_version WHERE workflow_version_id = $1;`, workflowVersionId)
	if err != nil {
		return 0, errors.Wrap(err, database.SqlExecutionError)
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return 0, errors.Wrap(err, database.SqlAffectedRowsCheckError)
	}
	return rowsAffected, nil
}

func GetActiveEventTriggerNodes(db *sqlx.DB, nodeType commons.WorkflowNodeType) ([]WorkflowNode, error) {
	var workflowVersionRootNodeIds []int
	err := db.Select(&workflowVersionRootNodeIds, `
		SELECT wfvn.workflow_version_node_id
		FROM workflow_version_node wfvn
		JOIN workflow_version wfv ON wfv.workflow_version_id = wfvn.workflow_version_id AND wfv.status=$1
		JOIN workflow wf ON wf.workflow_id = wfv.workflow_id AND wfv.status=$1
		LEFT JOIN workflow_version_node_link parentLink ON parentLink.child_workflow_version_node_id = wfvn.workflow_version_node_id
		WHERE wfvn.status=$1 AND wfvn.type=$2 AND parentLink.child_workflow_version_node_id IS NULL AND wfv.workflow_version_id IN (
			SELECT ranked.workflow_version_id
			FROM (
				SELECT v_wfv.workflow_version_id, RANK() OVER (PARTITION BY v_wfv.workflow_version_id ORDER BY version DESC) version_rank
				FROM workflow_version v_wfv
				WHERE v_wfv.status=$1
			) ranked
			WHERE ranked.version_rank = 1
		);`, commons.Active, nodeType)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []WorkflowNode{}, nil
		}
		return nil, errors.Wrap(err, database.SqlExecutionError)
	}
	var response []WorkflowNode
	for _, workflowVersionRootNodeId := range workflowVersionRootNodeIds {
		workflowNode, err := GetWorkflowNode(db, workflowVersionRootNodeId)
		if err != nil {
			return nil, errors.Wrapf(err, "Obtaining WorkflowNode for workflowVersionRootNodeId: %v", workflowVersionRootNodeId)
		}
		response = append(response, workflowNode)
	}
	return response, nil
}

func GetWorkflowNodeParameters(triggerNode WorkflowNode) (WorkflowNodeParameters, error) {
	var triggerParameters WorkflowNodeParameters
	err := json.Unmarshal([]byte(triggerNode.Parameters), &triggerParameters)
	if err != nil {
		return WorkflowNodeParameters{}, errors.Wrap(err, "JSON unmarshal")
	}
	return triggerParameters, nil
}

func getWorkflowNodeParameter(parameters WorkflowNodeParameters, parameterType commons.WorkflowParameterType) WorkflowNodeParameter {
	for _, parameter := range parameters.Parameters {
		if parameter.Type == parameterType {
			return parameter
		}
	}
	return WorkflowNodeParameter{}
}

// GetWorkflowNode is not recursive and only returns direct parent/child relations without further nesting.
func GetWorkflowNode(db *sqlx.DB, workflowVersionNodeId int) (WorkflowNode, error) {
	var wfvn WorkflowVersionNode
	err := db.Get(&wfvn, `SELECT * FROM workflow_version_node WHERE workflow_version_node_id=$1;`, workflowVersionNodeId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return WorkflowNode{}, nil
		}
		return WorkflowNode{}, errors.Wrap(err, database.SqlExecutionError)
	}

	parentNodes, parentNodeLinkDetails, err := getParentNodes(db, workflowVersionNodeId)
	if err != nil {
		return WorkflowNode{}, errors.Wrapf(err, "Obtaining parent nodes for workflowVersionNodeId: %v", workflowVersionNodeId)
	}

	childNodes, childNodeLinkDetails, err := getChildNodes(db, workflowVersionNodeId)
	if err != nil {
		return WorkflowNode{}, errors.Wrapf(err, "Obtaining child nodes for workflowVersionNodeId: %v", workflowVersionNodeId)
	}

	response := wfvn.GetWorkflowNodeStructured()
	if len(parentNodes) > 0 {
		response.ParentNodes = parentNodes
	}
	if len(childNodes) > 0 {
		response.ChildNodes = childNodes
	}
	if len(parentNodeLinkDetails) > 0 {
		response.LinkDetails = parentNodeLinkDetails
	}
	if len(childNodeLinkDetails) > 0 {
		if response.LinkDetails == nil {
			response.LinkDetails = childNodeLinkDetails
		} else {
			for childNodeLinkId, childNodeLink := range childNodeLinkDetails {
				response.LinkDetails[childNodeLinkId] = childNodeLink
			}
		}
	}
	return response, nil
}

// GetWorkflowTree this code assumes recursive loops from the root nodes are not allowed
func GetWorkflowTree(db *sqlx.DB, workflowVersionId int) (WorkflowTree, error) {
	var rootVersionNodeIds []int
	err := db.Select(&rootVersionNodeIds, `
		SELECT n.workflow_version_node_id
		FROM workflow_version_node n
		LEFT JOIN workflow_version_node_link parentLink ON parentLink.child_workflow_version_node_id = n.workflow_version_node_id
		WHERE n.workflow_version_id=$1 AND parentLink.child_workflow_version_node_id IS NULL;`, workflowVersionId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return WorkflowTree{}, nil
		}
		return WorkflowTree{}, errors.Wrap(err, database.SqlExecutionError)
	}

	processedNodes := make(map[int]*WorkflowNode)
	var rootNodesStructured []*WorkflowNode
	if len(rootVersionNodeIds) > 0 {
		for _, rootVersionNodeId := range rootVersionNodeIds {
			workflowVersionNode, err := GetWorkflowVersionNode(db, rootVersionNodeId)
			if err != nil {
				return WorkflowTree{}, err
			}
			workflowNode := workflowVersionNode.GetWorkflowNodeStructured()
			err = processNodeRecursion(processedNodes, db, &workflowNode, nil, nil)
			if err != nil {
				return WorkflowTree{}, err
			}
			rootNodesStructured = append(rootNodesStructured, &workflowNode)
		}
	}
	return WorkflowTree{RootNodes: rootNodesStructured}, nil
}

func processNodeRecursion(processedNodes map[int]*WorkflowNode, db *sqlx.DB, workflowNode *WorkflowNode,
	workflowParentNode *WorkflowNode, workflowParentNodeLink *WorkflowNodeLink) error {

	if workflowParentNode != nil && workflowParentNodeLink != nil {
		if workflowNode.ParentNodes == nil {
			workflowNode.ParentNodes = make(map[int]*WorkflowNode)
		}
		if workflowNode.LinkDetails == nil {
			workflowNode.LinkDetails = make(map[int]WorkflowNodeLink)
		}
		workflowNode.ParentNodes[workflowParentNodeLink.WorkflowVersionNodeLinkId] = workflowParentNode
		workflowNode.LinkDetails[workflowParentNodeLink.WorkflowVersionNodeLinkId] = *workflowParentNodeLink
	}
	childNodes, childNodeLinkDetails, err := getChildNodes(db, workflowNode.WorkflowVersionNodeId)
	if err != nil {
		return errors.Wrapf(err, "Obtaining child nodes for workflowVersionNodeId: %v", workflowNode.WorkflowVersionNodeId)
	}
	childNodesStructured := make(map[int]*WorkflowNode)
	for childNodeLinkId, childNode := range childNodes {
		alreadyProcessedNode, exists := processedNodes[childNode.WorkflowVersionNodeId]
		if exists && alreadyProcessedNode != nil && alreadyProcessedNode.WorkflowVersionNodeId != 0 {
			childNodesStructured[childNodeLinkId] = alreadyProcessedNode
		} else {
			childNodesStructured[childNodeLinkId] = childNode
			childNodeLinkDetail := childNodeLinkDetails[childNodeLinkId]
			err = processNodeRecursion(processedNodes, db, childNode, workflowNode, &childNodeLinkDetail)
			if err != nil {
				return errors.Wrapf(err, "Obtaining child nodes recursive for workflowVersionNodeId: %v", childNode.WorkflowVersionNodeId)
			}
		}
	}
	workflowNode.ChildNodes = childNodesStructured
	if workflowNode.LinkDetails == nil {
		workflowNode.LinkDetails = make(map[int]WorkflowNodeLink)
	}
	for childNodeLinkId, childNodeLink := range childNodeLinkDetails {
		workflowNode.LinkDetails[childNodeLinkId] = childNodeLink
	}
	return nil
}

func getParentNodes(db *sqlx.DB, workflowVersionNodeId int) (map[int]*WorkflowNode, map[int]WorkflowNodeLink, error) {
	rows, err := db.Query(`
		SELECT n.workflow_version_node_id, n.name, n.status, n.type, n.parameters, n.visibility_settings,
		       n.workflow_version_id, n.updated_on, l.parent_output_index, l.name linkName, l.child_input_index
		FROM workflow_version_node_link l
		JOIN workflow_version_node n ON n.workflow_version_node_id=l.child_workflow_version_node_id
		WHERE l.child_workflow_version_node_id=$1
		ORDER BY l.child_input_index;`, workflowVersionNodeId)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return nil, nil, errors.Wrap(err, database.SqlExecutionError)
		}
	}
	parentNodes := make(map[int]*WorkflowNode)
	parentNodeLinkDetails := make(map[int]WorkflowNodeLink)
	err = parseNodesResultSet(rows, parentNodes, parentNodeLinkDetails)
	if err != nil {
		return nil, nil, errors.Wrapf(err, "Parsing the resulset for parentNodes with workflowVersionNodeId: %v", workflowVersionNodeId)
	}
	return parentNodes, parentNodeLinkDetails, nil
}

func getChildNodes(db *sqlx.DB, workflowVersionNodeId int) (map[int]*WorkflowNode, map[int]WorkflowNodeLink, error) {
	rows, err := db.Query(`
		SELECT n.workflow_version_node_id, n.name, n.status, n.type, n.parameters, n.visibility_settings,
		       n.workflow_version_id, n.updated_on, l.parent_output_index, l.name linkName, l.child_input_index
		FROM workflow_version_node_link l
		JOIN workflow_version_node n ON n.workflow_version_node_id=l.parent_workflow_version_node_id
		WHERE l.parent_workflow_version_node_id=$1
		ORDER BY l.parent_output_index;`, workflowVersionNodeId)
	if err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return nil, nil, errors.Wrap(err, database.SqlExecutionError)
		}
	}
	childNodes := make(map[int]*WorkflowNode)
	childNodeLinkDetails := make(map[int]WorkflowNodeLink)
	err = parseNodesResultSet(rows, childNodes, childNodeLinkDetails)
	if err != nil {
		return nil, nil, errors.Wrapf(err, "Parsing the resulset for childNodes with workflowVersionNodeId: %v", workflowVersionNodeId)
	}
	return childNodes, childNodeLinkDetails, nil
}

func parseNodesResultSet(rows *sql.Rows, nodes map[int]*WorkflowNode, nodeLinkDetails map[int]WorkflowNodeLink) error {
	for rows.Next() {
		var versionNodeId int
		var name string
		var status commons.Status
		var nodeType commons.WorkflowNodeType
		var parameters string
		var visibilitySettings string
		var versionId int
		var updatedOn time.Time
		var versionNodeLinkId int
		var parentsOutputIndex int
		var linkName string
		var childsInputIndex int
		err := rows.Scan(&versionNodeId, &name, &status, &nodeType, &parameters, &visibilitySettings, &versionId, &updatedOn,
			&versionNodeLinkId, &parentsOutputIndex, &linkName, &childsInputIndex)
		if err != nil {
			return errors.Wrap(err, "Obtaining nodeId and publicKey from the resultSet")
		}
		nodeLinkDetails[versionNodeLinkId] = WorkflowNodeLink{
			WorkflowVersionNodeLinkId: versionNodeLinkId,
			ParentOutputIndex:         parentsOutputIndex,
			ChildInputIndex:           childsInputIndex,
			Name:                      linkName,
		}
		nodes[versionNodeLinkId] = &WorkflowNode{
			WorkflowVersionNodeId: versionNodeId,
			WorkflowVersionId:     versionId,
			Type:                  nodeType,
			Status:                status,
			Parameters:            parameters,
			VisibilitySettings:    visibilitySettings,
			UpdateOn:              updatedOn,
			Name:                  name,
		}
	}
	return nil
}

func GetWorkflowVersionNode(db *sqlx.DB, workflowVersionNodeId int) (WorkflowVersionNode, error) {
	var wfvn WorkflowVersionNode
	err := db.Get(&wfvn, `SELECT * FROM workflow_version_node WHERE workflow_version_node_id=$1;`, workflowVersionNodeId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return WorkflowVersionNode{}, nil
		}
		return WorkflowVersionNode{}, errors.Wrap(err, database.SqlExecutionError)
	}
	return wfvn, nil
}

func addWorkflowVersionNode(db *sqlx.DB, workflowVersionNode WorkflowVersionNode) (WorkflowVersionNode, error) {
	workflowVersionNode.CreatedOn = time.Now().UTC()
	if workflowVersionNode.Name == "" {
		workflowVersionNode.Name = fmt.Sprintf("%v", workflowVersionNode.CreatedOn.Format("20060102.150405.000000"))
	}
	workflowVersionNode.UpdateOn = workflowVersionNode.CreatedOn
	err := db.QueryRowx(`INSERT INTO workflow_version_node
    	(name, status, type, parameters, visibility_settings, workflow_version_id, created_on, updated_on)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING workflow_version_node_id;`,
		workflowVersionNode.Name, workflowVersionNode.Status, workflowVersionNode.Type, workflowVersionNode.Parameters,
		workflowVersionNode.VisibilitySettings, workflowVersionNode.WorkflowVersionId, workflowVersionNode.CreatedOn,
		workflowVersionNode.UpdateOn).Scan(&workflowVersionNode.WorkflowVersionNodeId)
	if err != nil {
		if err, ok := err.(*pq.Error); ok {
			if err.Code == "23505" {
				return WorkflowVersionNode{}, errors.Wrap(err, database.SqlUniqueConstraintError)
			}
		}
		return WorkflowVersionNode{}, errors.Wrap(err, database.SqlExecutionError)
	}
	return workflowVersionNode, nil
}

func setWorkflowVersionNode(db *sqlx.DB, workflowVersionNode WorkflowVersionNode) (WorkflowVersionNode, error) {
	workflowVersionNode.UpdateOn = time.Now().UTC()
	_, err := db.Exec(`UPDATE workflow_version_node
		SET name=$1, status=$2, type=$3, parameters=$4, visibility_settings=$5, workflow_version_id=$6, updated_on=$7
		WHERE workflow_version_node_id=$8;`,
		workflowVersionNode.Name, workflowVersionNode.Status, workflowVersionNode.Type, workflowVersionNode.Parameters,
		workflowVersionNode.VisibilitySettings, workflowVersionNode.WorkflowVersionId, workflowVersionNode.UpdateOn,
		workflowVersionNode.WorkflowVersionNodeId)
	if err != nil {
		if err, ok := err.(*pq.Error); ok {
			if err.Code == "23505" {
				return WorkflowVersionNode{}, errors.Wrap(err, database.SqlUniqueConstraintError)
			}
		}
		return WorkflowVersionNode{}, errors.Wrap(err, database.SqlExecutionError)
	}
	return workflowVersionNode, nil
}

func removeWorkflowVersionNode(db *sqlx.DB, workflowVersionNodeId int) (int64, error) {
	res, err := db.Exec(`DELETE FROM workflow_version_node WHERE workflow_version_node_id = $1;`, workflowVersionNodeId)
	if err != nil {
		return 0, errors.Wrap(err, database.SqlExecutionError)
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return 0, errors.Wrap(err, database.SqlAffectedRowsCheckError)
	}
	return rowsAffected, nil
}

func addWorkflowVersionNodeLink(db *sqlx.DB, workflowVersionNodeLink WorkflowVersionNodeLink) (WorkflowVersionNodeLink, error) {
	workflowVersionNodeLink.CreatedOn = time.Now().UTC()
	if workflowVersionNodeLink.Name == "" {
		workflowVersionNodeLink.Name = fmt.Sprintf("%v", workflowVersionNodeLink.CreatedOn.Format("20060102.150405.000000"))
	}
	workflowVersionNodeLink.UpdateOn = workflowVersionNodeLink.CreatedOn
	err := db.QueryRowx(`INSERT INTO workflow_version_node_link
    	(name, visibility_settings, parent_output_index, parent_workflow_version_node_id,
    	 child_input_index, child_workflow_version_node_id, workflow_version_id, created_on, updated_on)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING workflow_version_node_link_id;`,
		workflowVersionNodeLink.Name, workflowVersionNodeLink.VisibilitySettings,
		workflowVersionNodeLink.ParentOutputIndex, workflowVersionNodeLink.ParentWorkflowVersionNodeId,
		workflowVersionNodeLink.ChildInputIndex, workflowVersionNodeLink.ChildWorkflowVersionNodeId,
		workflowVersionNodeLink.WorkflowVersionId,
		workflowVersionNodeLink.CreatedOn, workflowVersionNodeLink.UpdateOn).Scan(&workflowVersionNodeLink.WorkflowVersionNodeLinkId)
	if err != nil {
		if err, ok := err.(*pq.Error); ok {
			if err.Code == "23505" {
				return WorkflowVersionNodeLink{}, errors.Wrap(err, database.SqlUniqueConstraintError)
			}
		}
		return WorkflowVersionNodeLink{}, errors.Wrap(err, database.SqlExecutionError)
	}
	return workflowVersionNodeLink, nil
}

func setWorkflowVersionNodeLink(db *sqlx.DB, workflowVersionNodeLink WorkflowVersionNodeLink) (WorkflowVersionNodeLink, error) {
	workflowVersionNodeLink.UpdateOn = time.Now().UTC()
	_, err := db.Exec(`UPDATE workflow_version_node_link
		SET name=$1, visibility_settings=$2, parent_output_index=$3,
		    parent_workflow_version_node_id=$4, child_input_index=$5, child_workflow_version_node_id=$6,
		    workflow_version_id=$7, updated_on=$8
		WHERE workflow_version_node_link_id=$9;`,
		workflowVersionNodeLink.Name, workflowVersionNodeLink.VisibilitySettings,
		workflowVersionNodeLink.ParentOutputIndex, workflowVersionNodeLink.ParentWorkflowVersionNodeId,
		workflowVersionNodeLink.ChildInputIndex, workflowVersionNodeLink.ChildWorkflowVersionNodeId,
		workflowVersionNodeLink.WorkflowVersionId,
		workflowVersionNodeLink.UpdateOn, workflowVersionNodeLink.WorkflowVersionNodeLinkId)
	if err != nil {
		if err, ok := err.(*pq.Error); ok {
			if err.Code == "23505" {
				return WorkflowVersionNodeLink{}, errors.Wrap(err, database.SqlUniqueConstraintError)
			}
		}
		return WorkflowVersionNodeLink{}, errors.Wrap(err, database.SqlExecutionError)
	}
	return workflowVersionNodeLink, nil
}

func removeWorkflowVersionNodeLink(db *sqlx.DB, workflowVersionNodeLinkId int) (int64, error) {
	res, err := db.Exec(`DELETE FROM workflow_version_node_link WHERE workflow_version_node_link_id = $1;`, workflowVersionNodeLinkId)
	if err != nil {
		return 0, errors.Wrap(err, database.SqlExecutionError)
	}
	rowsAffected, err := res.RowsAffected()
	if err != nil {
		return 0, errors.Wrap(err, database.SqlAffectedRowsCheckError)
	}
	return rowsAffected, nil
}

func addWorkflowVersionNodeLog(db *sqlx.DB, workflowVersionNodeLog WorkflowVersionNodeLog) (WorkflowVersionNodeLog, error) {
	workflowVersionNodeLog.CreatedOn = time.Now().UTC()
	_, err := db.Exec(`INSERT INTO workflow_version_node_log
    	(node_id, trigger_reference, input_data, output_data, debug_data, error_data, workflow_version_node_id, triggered_workflow_version_node_id, created_on)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
		workflowVersionNodeLog.NodeId, workflowVersionNodeLog.TriggerReference,
		workflowVersionNodeLog.InputData, workflowVersionNodeLog.OutputData, workflowVersionNodeLog.DebugData,
		workflowVersionNodeLog.ErrorData, workflowVersionNodeLog.WorkflowVersionNodeId,
		workflowVersionNodeLog.TriggeredWorkflowVersionNodeId, workflowVersionNodeLog.CreatedOn)
	if err != nil {
		return WorkflowVersionNodeLog{}, errors.Wrap(err, database.SqlExecutionError)
	}
	return workflowVersionNodeLog, nil
}

func GetWorkflowVersionNodeLogs(db *sqlx.DB, workflowVersionNodeId int, maximumResultCount int) ([]WorkflowVersionNodeLog, error) {
	var wfvnls []WorkflowVersionNodeLog
	err := db.Get(&wfvnls,
		fmt.Sprintf(
			"SELECT * FROM workflow_version_node_log WHERE workflow_version_node_id=$1 ORDER BY created_on DESC LIMIT %d;", maximumResultCount),
		workflowVersionNodeId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []WorkflowVersionNodeLog{}, nil
		}
		return nil, errors.Wrap(err, database.SqlExecutionError)
	}
	return wfvnls, nil
}

func GetWorkflowLogs(db *sqlx.DB, workflowId int, maximumResultCount int) ([]WorkflowVersionNodeLog, error) {
	var wfvnls []WorkflowVersionNodeLog
	err := db.Get(&wfvnls,
		fmt.Sprintf(
			"SELECT * "+
				"FROM workflow_version_node_log wfvnls "+
				"JOIN workflow_version_node wfvn ON wfvn.workflow_version_node_id=wfvnls.workflow_version_node_id "+
				"JOIN workflow_version wfv ON wfv.workflow_version_id=wfvn.workflow_version_id "+
				"WHERE wfv.workflow_id=$1 "+
				"ORDER BY created_on DESC "+
				"LIMIT %d;", maximumResultCount),
		workflowId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []WorkflowVersionNodeLog{}, nil
		}
		return nil, errors.Wrap(err, database.SqlExecutionError)
	}
	return wfvnls, nil
}
