import os
from generate_data import main as generate_data_main
from model import train_model
from features import extract_features_from_txs # Ensure imported to avoid issues

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, "data", "synthetic_dataset.json")
    
    print("--- Starting Training Pipeline ---")
    
    # 1. Generate data if not exists
    if not os.path.exists(data_path):
        print("Data not found. Generating synthetic transaction data...")
        generate_data_main()
    else:
        print(f"Using existing data at {data_path}")
        
    # 2. Extract features and train
    print("Extracting features and training Gradient Boosting model...")
    metrics = train_model(data_path)
    
    print("--- Training Complete ---")
    print(f"Model MSE: {metrics['mse']:.4f}")
    print(f"Model R2 Score: {metrics['r2']:.4f}")
    print(f"Model saved to models/scoring_model.joblib")
