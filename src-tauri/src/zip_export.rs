use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

use zip::write::SimpleFileOptions;
use zip::CompressionMethod;

use crate::export::ExportError;

pub fn export_multiple_to_zip(
    entries: &[(String, String)],
    output_path: &str,
) -> Result<String, ExportError> {
    if entries.is_empty() {
        return Err(ExportError::IoError(
            "No entries to write to zip.".to_string(),
        ));
    }
    let path = Path::new(output_path);

    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| ExportError::IoError(format!("Cannot create directory: {}", e)))?;
        }
    }

    let file = File::create(path)
        .map_err(|e| ExportError::IoError(format!("Cannot create zip file: {}", e)))?;

    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o644);

    let write_result = (|| -> Result<(), ExportError> {
        for (filename, content) in entries {
            zip.start_file(filename.as_str(), options)
                .map_err(|e| ExportError::IoError(format!("Zip write error: {}", e)))?;
            zip.write_all(content.as_bytes())
                .map_err(|e| ExportError::IoError(format!("Zip write error: {}", e)))?;
        }
        zip.finish()
            .map_err(|e| ExportError::IoError(format!("Zip finish error: {}", e)))?;
        Ok(())
    })();

    if let Err(e) = write_result {
        let _ = fs::remove_file(path);
        return Err(e);
    }

    Ok(output_path.to_string())
}
