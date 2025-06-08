-- Create function to add editor to project
CREATE OR REPLACE FUNCTION add_project_editor(
  p_project_id UUID,
  p_editor_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Add editor to youtuber_editors table
  INSERT INTO youtuber_editors (project_id, editor_id, status)
  VALUES (p_project_id, p_editor_id, 'active');

  -- Update project's editor_id
  UPDATE projects
  SET editor_id = p_editor_id
  WHERE id = p_project_id;

  -- Return success
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Editor added successfully'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
    RETURN v_result;
END;
$$; 