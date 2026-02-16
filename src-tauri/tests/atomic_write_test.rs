use app_lib::fs::write_file_atomic;
use std::fs;
use std::path::Path;

#[test]
fn test_write_file_atomic_success() {
    let test_dir = "test_atomic_success";
    let file_path = format!("{}/test.txt", test_dir);

    if Path::new(test_dir).exists() {
        fs::remove_dir_all(test_dir).unwrap();
    }
    fs::create_dir(test_dir).unwrap();

    let content = "Hello, Atomic World!";

    let result = write_file_atomic(&file_path, content);

    assert!(result.is_ok());
    let saved_content = fs::read_to_string(&file_path).unwrap();
    assert_eq!(saved_content, content);

    fs::remove_dir_all(test_dir).unwrap();
}

#[test]
fn test_write_file_atomic_failure_recovery() {
    let test_dir = "test_atomic_failure";
    let file_path = format!("{}/test.txt", test_dir);

    if Path::new(test_dir).exists() {
        fs::remove_dir_all(test_dir).unwrap();
    }
    fs::create_dir(test_dir).unwrap();

    let original_content = "Original Content";
    fs::write(&file_path, original_content).unwrap();

    let mut permissions = fs::metadata(test_dir).unwrap().permissions();
    permissions.set_readonly(true);
    fs::set_permissions(test_dir, permissions).unwrap();

    let new_content = "New Content";

    let result = write_file_atomic(&file_path, new_content);

    assert!(
        result.is_err(),
        "Expected error when directory is read-only"
    );

    let mut permissions = fs::metadata(test_dir).unwrap().permissions();
    permissions.set_readonly(false);
    fs::set_permissions(test_dir, permissions).unwrap();

    let saved_content = fs::read_to_string(&file_path).unwrap();
    assert_eq!(
        saved_content, original_content,
        "Original content should be preserved on failure"
    );

    let temp_file_path = format!("{}/.test.txt.tmp", test_dir);
    assert!(
        !Path::new(&temp_file_path).exists(),
        "Temp file should be cleaned up"
    );

    fs::remove_dir_all(test_dir).unwrap();
}

#[test]
fn test_write_file_atomic_rename_failure() {
    let test_dir = "test_atomic_rename_failure";
    let file_path = format!("{}/test_dir_target", test_dir);

    if Path::new(test_dir).exists() {
        fs::remove_dir_all(test_dir).unwrap();
    }
    fs::create_dir(test_dir).unwrap();

    fs::create_dir(&file_path).unwrap();

    let content = "New Content";

    let result = write_file_atomic(&file_path, content);

    assert!(result.is_err(), "Expected error when target is a directory");
    assert!(
        Path::new(&file_path).is_dir(),
        "Target directory should still be a directory"
    );

    let temp_file_path = format!("{}/.test_dir_target.tmp", test_dir);
    assert!(
        !Path::new(&temp_file_path).exists(),
        "Temp file should be cleaned up"
    );

    fs::remove_dir_all(test_dir).unwrap();
}
