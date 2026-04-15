from pathlib import Path
import pandas as pd
import kagglehub 
import shutil

def download_dataset():

    dataset_path = kagglehub.dataset_download("mlg-ulb/creditcardfraud")

    project_root= Path(__file__).resolve().parents[1]
    data_dir = project_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    source_file = Path(dataset_path) / "creditcard.csv"
    destination_file = data_dir / "creditcard.csv"

    if not destination_file.exists():
        shutil.copy(source_file, destination_file)
    
    return destination_file

def load_creditCard_data():
    csv_path = download_dataset()
    df = pd.read_csv(csv_path)
    return df

def summarize_data(df):
    print("Dataset shape: ", df.shape)
    print("\nColumns:")
    print(df.columns.tolist())

    print("\nMissing values:")
    print(df.isnull().sum())

    print("\nClass distribution:")
    print(df["Class"].value_counts())

    print("\nFraud ratio:")
    print(df["Class"].mean())

if __name__ == "__main__":
    dataset = load_creditCard_data()

    print(dataset.head())
    summarize_data(dataset)