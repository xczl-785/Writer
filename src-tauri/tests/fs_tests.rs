use app_lib::fs;

#[test]
fn test_fs_crud() {
    let temp_dir = std::env::temp_dir().join("writer_fs_test");
    if temp_dir.exists() {
        std::fs::remove_dir_all(&temp_dir).unwrap();
    }
    std::fs::create_dir_all(&temp_dir).unwrap();

    let file_path = temp_dir.join("test.txt");
    let file_path_str = file_path.to_str().unwrap();
    assert!(fs::create_file(file_path_str).is_ok());
    assert!(file_path.exists());

    assert!(fs::create_file(file_path_str).is_err());

    let new_file_path = temp_dir.join("renamed.txt");
    let new_file_path_str = new_file_path.to_str().unwrap();
    assert!(fs::rename_node(file_path_str, new_file_path_str).is_ok());
    assert!(!file_path.exists());
    assert!(new_file_path.exists());

    assert!(fs::delete_node(new_file_path_str).is_ok());
    assert!(!new_file_path.exists());

    let dir_path = temp_dir.join("subdir");
    let dir_path_str = dir_path.to_str().unwrap();
    assert!(fs::create_dir(dir_path_str).is_ok());
    assert!(dir_path.exists());
    assert!(dir_path.is_dir());

    assert!(fs::create_dir(dir_path_str).is_err());

    assert!(fs::delete_node(dir_path_str).is_ok());
    assert!(!dir_path.exists());

    std::fs::remove_dir_all(&temp_dir).unwrap();
}
