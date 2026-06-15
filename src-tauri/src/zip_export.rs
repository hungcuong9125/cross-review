use std::fs::File;
use std::io::Write;
use std::path::Path;

use zip::write::SimpleFileOptions;
use zip::CompressionMethod;

use crate::export::{generate_exports, ExportError};
use crate::models::Project;

/// Exports all markdown files into a single zip archive.
/// Returns the path to the created zip file.
pub fn export_to_zip(project: &Project, output_path: &str) -> Result<String, ExportError> {
    let exports = generate_exports(project)?;

    let file = File::create(Path::new(output_path))
        .map_err(|e| ExportError::ValidationFailed(format!("Cannot create zip file: {}", e)))?;

    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o644);

    for export in &exports {
        zip.start_file(&export.filename, options)
            .map_err(|e| ExportError::ValidationFailed(format!("Zip write error: {}", e)))?;
        zip.write_all(export.markdown.as_bytes())
            .map_err(|e| ExportError::ValidationFailed(format!("Zip write error: {}", e)))?;
    }

    zip.finish()
        .map_err(|e| ExportError::ValidationFailed(format!("Zip finish error: {}", e)))?;

    Ok(output_path.to_string())
}
